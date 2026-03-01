import { db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, addDoc, writeBatch } from './firebase.js';

const SESSION_KEY = 'accios-user-session';

class UserAuth {

  // ─── PIN Hashing ───────────────────────────────────────
  async hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'accios-core-salt-v2');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Phone Formatting ─────────────────────────────────
  formatPhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('507')) {
      return '+' + cleaned;
    }
    if (cleaned.length === 8 || cleaned.length === 7) {
      return '+507' + cleaned;
    }
    return '+' + cleaned;
  }

  // ─── User Lookup ──────────────────────────────────────
  async lookupPhone(phone) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { exists: true, data: { id: snap.id, ...snap.data() } };
      }
      return { exists: false, data: null };
    } catch (e) {
      console.error('Phone lookup failed:', e);
      throw new Error('Error al buscar el usuario');
    }
  }

  // ─── PIN Management ───────────────────────────────────
  async createPin(phone, pin) {
    const formatted = this.formatPhone(phone);
    const pinHash = await this.hashPin(pin);
    try {
      const docRef = doc(db, 'users', formatted);
      await updateDoc(docRef, {
        pinHash,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('Create PIN failed:', e);
      throw new Error('Error al crear el PIN');
    }
  }

  async verifyPin(phone, pin) {
    const formatted = this.formatPhone(phone);
    const pinHash = await this.hashPin(pin);
    try {
      const docRef = doc(db, 'users', formatted);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().pinHash === pinHash) {
        await updateDoc(docRef, { lastLogin: new Date().toISOString() });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Verify PIN failed:', e);
      return false;
    }
  }

  // ─── Session Management ───────────────────────────────
  saveSession(userData) {
    const session = {
      phone: userData.phone || userData.id,
      name: userData.name,
      role: userData.role,
      businesses: userData.businesses || [],
      savedAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  isLoggedIn() {
    return this.getSession() !== null;
  }

  getCurrentUser() {
    return this.getSession();
  }

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ─── User CRUD (SuperAdmin) ───────────────────────────
  async createUser({ phone, name, role, businesses }) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      await setDoc(docRef, {
        phone: formatted,
        name,
        role: role || 'client',
        businesses: businesses || [],
        pinHash: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
      });
      return true;
    } catch (e) {
      console.error('Create user failed:', e);
      throw new Error('Error al crear usuario');
    }
  }

  async updateUser(phone, updates) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Update user failed:', e);
      throw new Error('Error al actualizar usuario');
    }
  }

  async resetPin(phone) {
    return await this.updateUser(phone, { pinHash: '' });
  }

  async deleteUser(phone) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Delete user failed:', e);
      throw new Error('Error al eliminar usuario');
    }
  }

  async getAllUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all users failed:', e);
      return [];
    }
  }

  // ─── Business CRUD (SuperAdmin) ───────────────────────
  async createBusiness({ id, nombre, logo, contenido_valor, acuerdo_recurrente, fecha_corte, fecha_vencimiento }) {
    try {
      const docRef = doc(db, 'businesses', id);
      await setDoc(docRef, {
        nombre,
        logo: logo || '',
        contenido_valor: contenido_valor || '',
        acuerdo_recurrente: acuerdo_recurrente || 0,
        fecha_corte: fecha_corte || 0,
        fecha_vencimiento: fecha_vencimiento || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('Create business failed:', e);
      throw new Error('Error al crear negocio');
    }
  }

  async updateBusiness(id, updates) {
    try {
      const docRef = doc(db, 'businesses', id);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Update business failed:', e);
      throw new Error('Error al actualizar negocio');
    }
  }

  async deleteBusiness(id) {
    try {
      const docRef = doc(db, 'businesses', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Delete business failed:', e);
      throw new Error('Error al eliminar negocio');
    }
  }

  async getAllBusinesses() {
    try {
      const snap = await getDocs(collection(db, 'businesses'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all businesses failed:', e);
      return [];
    }
  }

  async getBusiness(id) {
    try {
      const docRef = doc(db, 'businesses', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      console.error('Get business failed:', e);
      return null;
    }
  }

  // ─── Business Charges ────────────────────────────────

  async createCharge({ businessId, type, description, amount, date, month }) {
    try {
      const colRef = collection(db, 'business_charges');
      const docRef = await addDoc(colRef, {
        businessId,
        type,
        description,
        amount: amount || 0,
        status: 'por_cobrar',
        date: date || new Date().toISOString().substring(0, 10),
        month: month || new Date().toISOString().substring(0, 7),
        abonos: [],
        paidAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paidAt: null,
      });
      return docRef.id;
    } catch (e) {
      console.error('Create charge failed:', e);
      throw new Error('Error al crear cargo');
    }
  }

  async getChargesForBusiness(businessId, month) {
    try {
      const all = await this.getAllChargesForMonth(month);
      return all.filter(c => c.businessId === businessId);
    } catch (e) {
      console.error('Get charges for business failed:', e);
      return [];
    }
  }

  async getAllChargesForMonth(month) {
    try {
      const q = query(collection(db, 'business_charges'), where('month', '==', month));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all charges for month failed:', e);
      return [];
    }
  }

  async updateCharge(id, updates) {
    try {
      const docRef = doc(db, 'business_charges', id);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Update charge failed:', e);
      throw new Error('Error al actualizar cargo');
    }
  }

  async deleteCharge(id) {
    try {
      const docRef = doc(db, 'business_charges', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Delete charge failed:', e);
      throw new Error('Error al eliminar cargo');
    }
  }

  async addAbono(chargeId, amount) {
    try {
      const docRef = doc(db, 'business_charges', chargeId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Cargo no encontrado');

      const data = snap.data();
      const abonos = data.abonos || [];
      abonos.push({ amount, date: new Date().toISOString() });
      const paidAmount = abonos.reduce((sum, a) => sum + a.amount, 0);
      const updates = { abonos, paidAmount, updatedAt: new Date().toISOString() };

      if (paidAmount >= data.amount) {
        updates.status = 'cobrado';
        updates.paidAt = new Date().toISOString();
      }

      await updateDoc(docRef, updates);
      return { ...data, ...updates };
    } catch (e) {
      console.error('Add abono failed:', e);
      throw new Error('Error al registrar abono');
    }
  }

  async toggleChargeStatus(chargeId) {
    try {
      const docRef = doc(db, 'business_charges', chargeId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Cargo no encontrado');

      const data = snap.data();
      const newStatus = data.status === 'por_cobrar' ? 'cobrado' : 'por_cobrar';
      const updates = { status: newStatus, updatedAt: new Date().toISOString() };
      if (newStatus === 'cobrado') {
        updates.paidAt = new Date().toISOString();
        updates.paidAmount = data.amount;
      } else {
        updates.paidAt = null;
        updates.paidAmount = 0;
        updates.abonos = [];
      }
      await updateDoc(docRef, updates);
      return { ...data, ...updates };
    } catch (e) {
      console.error('Toggle charge status failed:', e);
      throw new Error('Error al cambiar estado de cobro');
    }
  }

  async ensureMonthlyMemberships(businesses, month) {
    try {
      const existing = await this.getAllChargesForMonth(month);
      const existingMemberships = existing.filter(c => c.type === 'membresia');
      const existingBizIds = new Set(existingMemberships.map(c => c.businessId));

      const batch = writeBatch(db);
      let needsWrite = false;

      for (const biz of businesses) {
        if (!biz.acuerdo_recurrente || biz.acuerdo_recurrente <= 0) continue;
        if (existingBizIds.has(biz.id)) continue;

        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('es', { month: 'long' });
        const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const corteDay = String(biz.fecha_corte || 1).padStart(2, '0');

        const colRef = collection(db, 'business_charges');
        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
          businessId: biz.id,
          type: 'membresia',
          description: `Membresía ${displayMonth} ${year}`,
          amount: biz.acuerdo_recurrente,
          status: 'por_cobrar',
          date: `${month}-${corteDay}`,
          month,
          abonos: [],
          paidAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          paidAt: null,
        });
        needsWrite = true;
      }

      if (needsWrite) await batch.commit();
      return await this.getAllChargesForMonth(month);
    } catch (e) {
      console.error('Ensure monthly memberships failed:', e);
      return [];
    }
  }

  // ─── User-Business Linking ────────────────────────────
  // The "businesses" array on each user document acts as our
  // User_Business_Rel join table. This is more efficient in
  // Firestore than a separate collection for a simple many-to-many.

  async linkBusinessToUser(phone, businessId) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Usuario no encontrado');

      const current = snap.data().businesses || [];
      if (!current.includes(businessId)) {
        current.push(businessId);
        await updateDoc(docRef, { businesses: current, updatedAt: new Date().toISOString() });
      }
      return true;
    } catch (e) {
      console.error('Link business failed:', e);
      throw new Error('Error al vincular negocio');
    }
  }

  async unlinkBusinessFromUser(phone, businessId) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Usuario no encontrado');

      const current = snap.data().businesses || [];
      const updated = current.filter(b => b !== businessId);
      await updateDoc(docRef, { businesses: updated, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Unlink business failed:', e);
      throw new Error('Error al desvincular negocio');
    }
  }

  async getUserBusinesses(phone) {
    const formatted = this.formatPhone(phone);
    try {
      const docRef = doc(db, 'users', formatted);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return [];

      const businessIds = snap.data().businesses || [];
      const businesses = [];
      for (const bizId of businessIds) {
        const biz = await this.getBusiness(bizId);
        if (biz) businesses.push(biz);
      }
      return businesses;
    } catch (e) {
      console.error('Get user businesses failed:', e);
      return [];
    }
  }
  // ─── Onboarding Responses ────────────────────────────

  async saveOnboardingResponse(phone, businessId, data) {
    const formatted = this.formatPhone(phone);
    const docId = `${formatted}_${businessId}`;
    try {
      const docRef = doc(db, 'onboarding_responses', docId);
      await setDoc(docRef, {
        ...data,
        userId: formatted,
        businessId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('Save onboarding response failed:', e);
      throw new Error('Error al guardar respuesta de onboarding');
    }
  }

  async getOnboardingResponse(phone, businessId) {
    const formatted = this.formatPhone(phone);
    const docId = `${formatted}_${businessId}`;
    try {
      const docRef = doc(db, 'onboarding_responses', docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      console.error('Get onboarding response failed:', e);
      return null;
    }
  }

  async getAllOnboardingResponses() {
    try {
      const snap = await getDocs(collection(db, 'onboarding_responses'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all onboarding responses failed:', e);
      return [];
    }
  }

  // ─── Episode CRUD (SuperAdmin) ─────────────────────

  async createEpisode({ id, num, title, status, duration, quote, color, businessId, richContent }) {
    try {
      const docRef = doc(db, 'episodes', id);
      await setDoc(docRef, {
        num,
        title,
        status: status || 'pre-produccion',
        duration: duration || '',
        quote: quote || '',
        color: color || '#7C3AED',
        businessId: businessId || 'mdn-podcast',
        richContent: richContent || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('Create episode failed:', e);
      throw new Error('Error al crear capitulo');
    }
  }

  async updateEpisode(id, updates) {
    try {
      const docRef = doc(db, 'episodes', id);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Update episode failed:', e);
      throw new Error('Error al actualizar capitulo');
    }
  }

  async deleteEpisode(id) {
    try {
      const docRef = doc(db, 'episodes', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Delete episode failed:', e);
      throw new Error('Error al eliminar capitulo');
    }
  }

  async getAllEpisodes() {
    try {
      const snap = await getDocs(collection(db, 'episodes'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all episodes failed:', e);
      return [];
    }
  }

  async getEpisodesByBusiness(businessId) {
    try {
      const q = query(collection(db, 'episodes'), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get episodes by business failed:', e);
      return [];
    }
  }

  // ─── Episode Comments ──────────────────────────────

  async addComment({ episodeId, businessId, userId, userName, text }) {
    try {
      const colRef = collection(db, 'episode_comments');
      await addDoc(colRef, {
        episodeId,
        businessId,
        userId,
        userName,
        text,
        createdAt: new Date().toISOString(),
        read: false,
      });
      return true;
    } catch (e) {
      console.error('Add comment failed:', e);
      throw new Error('Error al enviar comentario');
    }
  }

  async getCommentsByEpisode(episodeId) {
    try {
      const q = query(
        collection(db, 'episode_comments'),
        where('episodeId', '==', episodeId),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: if composite index not ready, fetch without orderBy
      console.warn('Ordered query failed, using fallback:', e);
      try {
        const q2 = query(collection(db, 'episode_comments'), where('episodeId', '==', episodeId));
        const snap = await getDocs(q2);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      } catch (e2) {
        console.error('Get comments fallback failed:', e2);
        return [];
      }
    }
  }

  async getAllComments() {
    try {
      const snap = await getDocs(collection(db, 'episode_comments'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get all comments failed:', e);
      return [];
    }
  }

  async markCommentRead(commentId) {
    try {
      const docRef = doc(db, 'episode_comments', commentId);
      await updateDoc(docRef, { read: true });
      return true;
    } catch (e) {
      console.error('Mark comment read failed:', e);
      return false;
    }
  }

  async markAllCommentsRead() {
    try {
      const q = query(collection(db, 'episode_comments'), where('read', '==', false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
      return true;
    } catch (e) {
      console.error('Mark all read failed:', e);
      return false;
    }
  }

  // ═══════════════════════════════════════
  //  APPOINTMENTS
  // ═══════════════════════════════════════

  async createAppointment(data) {
    try {
      const colRef = collection(db, 'appointments');
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (e) {
      console.error('Create appointment failed:', e);
      throw new Error('Error al agendar cita');
    }
  }

  async getAllAppointments() {
    try {
      const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Get appointments failed:', e);
      return [];
    }
  }

  async updateAppointment(id, updates) {
    try {
      const docRef = doc(db, 'appointments', id);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Update appointment failed:', e);
      throw new Error('Error al actualizar cita');
    }
  }
}

export default new UserAuth();
