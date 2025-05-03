import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class ProfileManager {
  constructor(profilePath) {
    this.profilePath = profilePath;
    this.profiles = this.#loadProfiles();
  }

  #loadProfiles() {
    if (!fs.existsSync(this.profilePath)) {
      fs.writeFileSync(this.profilePath, JSON.stringify({ profiles: [] }, null, 2));
    }
    const data = fs.readFileSync(this.profilePath, 'utf-8');
    return JSON.parse(data).profiles;
  }

  #saveProfiles() {
    fs.writeFileSync(this.profilePath, JSON.stringify({ profiles: this.profiles }, null, 2));
  }

  listProfiles() {
    return this.profiles;
  }

  getProfile(id) {
    return this.profiles.find(p => p.id === id);
  }

  createProfile(profileData) {
    const profile = {
      ...profileData,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.profiles.push(profile);
    this.#saveProfiles();
    return profile;
  }

  updateProfile(id, updates) {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Perfil no encontrado');
    this.profiles[idx] = { ...this.profiles[idx], ...updates, updatedAt: Date.now() };
    this.#saveProfiles();
    return this.profiles[idx];
  }

  deleteProfile(id) {
    this.profiles = this.profiles.filter(p => p.id !== id);
    this.#saveProfiles();
  }
}

export default ProfileManager;
