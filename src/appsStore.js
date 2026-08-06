import { useState, useEffect, useRef } from 'react';
import { fetchCloudApps, saveCloudApps, supabase } from './supabase';

const STORAGE_KEY = 'taskmanager_apps_v1';

const defaultApps = [
  { id: '1', name: '返信テンプレ・メモ', url: 'https://reply-template-notes.ajimarinne.chatgpt.site/' },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultApps;
  } catch {
    return defaultApps;
  }
}

function save(apps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function sameApps(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useApps() {
  const [apps, setApps] = useState(load);
  const loaded = useRef(false);
  const saveTimer = useRef(null);
  const appsRef = useRef(apps);
  const syncingFromCloud = useRef(false);

  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  useEffect(() => {
    if (!supabase) return;
    fetchCloudApps().then(cloud => {
      if (cloud && Array.isArray(cloud)) {
        syncingFromCloud.current = true;
        setApps(cloud);
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = setInterval(async () => {
      const cloud = await fetchCloudApps();
      if (cloud && Array.isArray(cloud) && !sameApps(cloud, appsRef.current)) {
        syncingFromCloud.current = true;
        setApps(cloud);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    save(apps);
    if (!supabase || !loaded.current) return;
    if (syncingFromCloud.current) {
      syncingFromCloud.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCloudApps(apps), 800);
    return () => clearTimeout(saveTimer.current);
  }, [apps]);

  const addApp = ({ name, url }) => {
    const id = Date.now().toString();
    setApps(prev => [...prev, { id, name, url }]);
  };

  const deleteApp = (id) => {
    setApps(prev => prev.filter(a => a.id !== id));
  };

  return { apps, addApp, deleteApp };
}
