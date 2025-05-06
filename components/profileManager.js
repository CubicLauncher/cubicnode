import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class ProfileManager {
  constructor(profilePath) {
    this.profilePath = profilePath;
    this.profiles = [];
    this.lastModified = null;
    this.#initializeProfiles();
  }

  #initializeProfiles() {
    if (!fs.existsSync(this.profilePath)) {
      this.profiles = [];
      this.#saveProfiles();
      return;
    }

    try {
      const stats = fs.statSync(this.profilePath);
      const currentModified = stats.mtime.getTime();

      if (this.lastModified === null || currentModified > this.lastModified) {
        const data = fs.readFileSync(this.profilePath, 'utf-8');
        const parsedData = JSON.parse(data);
        this.profiles = parsedData.profiles || [];
        this.lastModified = currentModified;
      }
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      this.profiles = [];
    }
  }

  #isProfileChanged(existingProfile, newProfile) {
    const importantFields = ['username', 'paths', 'config', 'settings'];
    return importantFields.some(field => {
      const existingValue = JSON.stringify(existingProfile[field]);
      const newValue = JSON.stringify(newProfile[field]);
      return existingValue !== newValue;
    });
  }

  updatePath(newPath) {
    this.profilePath = newPath;
    this.lastModified = null;
    this.#initializeProfiles();
  }

  #saveProfiles() {
    try {
      fs.writeFileSync(this.profilePath, JSON.stringify({ profiles: this.profiles }, null, 2));
      const stats = fs.statSync(this.profilePath);
      this.lastModified = stats.mtime.getTime();
    } catch (error) {
      console.error('Error al guardar perfiles:', error);
    }
  }

  listProfiles() {
    // Ordenar perfiles por updatedAt para asegurar que los más recientes aparezcan primero
    return [...this.profiles].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getProfile(id) {
    return this.profiles.find(p => p.id === id);
  }

  getLatestProfile(username) {
    // Obtener el perfil más reciente para un username específico
    return this.profiles
      .filter(p => p.username === username)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }

  createProfile(profileData) {
    // Verificar si ya existe un perfil con el mismo username
    const existingProfile = this.getLatestProfile(profileData.username);

    if (existingProfile) {
      // Si existe, eliminar el perfil anterior y crear uno nuevo
      this.deleteProfile(existingProfile.id);
    }

    const newProfile = {
      ...profileData,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.profiles.push(newProfile);
    this.#saveProfiles();
    return newProfile;
  }

  updateProfile(id, updates) {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Perfil no encontrado');

    // Crear nuevo perfil con los updates
    const newProfile = {
      ...updates,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Eliminar el perfil anterior
    this.deleteProfile(id);

    // Agregar el nuevo perfil
    this.profiles.push(newProfile);
    this.#saveProfiles();
    return newProfile;
  }

  deleteProfile(id) {
    this.profiles = this.profiles.filter(p => p.id !== id);
    this.#saveProfiles();
  }
}

export default ProfileManager;
