import type { AppData, Group } from './types.tsx';

const DATA_KEY = 'deudaData';

let data: AppData = { groups: {} };

export function loadData(): void {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch {
    data = { groups: {} };
  }
}

export function saveData(): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

export function getGroups(): Record<string, Group> {
  return data.groups;
}

export function getGroup(id: string): Group | undefined {
  return data.groups[id];
}

export function setGroup(group: Group): void {
  data.groups[group.id] = group;
  saveData();
}

export function deleteGroup(id: string): void {
  delete data.groups[id];
  saveData();
}

export function findGroupByCode(code: string): Group | undefined {
  return Object.values(data.groups).find(g => g.accessCode === code.toUpperCase());
}
