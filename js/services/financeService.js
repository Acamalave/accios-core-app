import { db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, query, where, orderBy, addDoc } from './firebase.js';

class FinanceService {

  // ═══════════════════════════════════════════════════════════
  //  CLIENTS
  // ═══════════════════════════════════════════════════════════

  async createClient({ name, contactName, phone, email, notes }) {
    try {
      const colRef = collection(db, 'fin_clients');
      const docRef = await addDoc(colRef, {
        name,
        contactName: contactName || '',
        phone: phone || '',
        email: email || '',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { id: docRef.id, name, contactName, phone, email, notes };
    } catch (e) {
      console.error('Error al crear cliente:', e);
      throw e;
    }
  }

  async updateClient(clientId, updates) {
    try {
      const docRef = doc(db, 'fin_clients', clientId);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Error al actualizar cliente:', e);
      throw e;
    }
  }

  async deleteClient(clientId) {
    try {
      const docRef = doc(db, 'fin_clients', clientId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Error al eliminar cliente:', e);
      throw e;
    }
  }

  async getClient(clientId) {
    try {
      const docRef = doc(db, 'fin_clients', clientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      console.error('Error al obtener cliente:', e);
      throw e;
    }
  }

  async getAllClients() {
    try {
      const snap = await getDocs(collection(db, 'fin_clients'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener lista de clientes:', e);
      throw e;
    }
  }

  async getClientByPortalUser(userId) {
    try {
      const q = query(collection(db, 'fin_clients'), where('portalUserId', '==', userId));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const first = snap.docs[0];
      return { id: first.id, ...first.data() };
    } catch (e) {
      console.error('Error al buscar cliente por usuario de portal:', e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TRANSACTIONS
  // ═══════════════════════════════════════════════════════════

  async createTransaction({ clientId, clientName, description, totalAmount, extras, type, recurrenceDay, dueDate, createdBy }) {
    try {
      const colRef = collection(db, 'fin_transactions');
      const now = new Date().toISOString();
      const data = {
        clientId,
        clientName: clientName || '',
        description: description || '',
        totalAmount: Number(totalAmount),
        extras: extras || [],
        type: type || 'one_time',
        recurrenceDay: recurrenceDay || null,
        dueDate: dueDate || null,
        createdBy: createdBy || '',
        amountPaid: 0,
        pendingAmount: Number(totalAmount),
        status: 'por_cobrar',
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(colRef, data);
      const created = { id: docRef.id, ...data };

      await this._logAction({
        action: 'create_transaction',
        entityType: 'transaction',
        entityId: docRef.id,
        clientId,
        previousValue: null,
        newValue: created,
        performedBy: createdBy,
      });

      return created;
    } catch (e) {
      console.error('Error al crear transaccion:', e);
      throw e;
    }
  }

  async updateTransaction(txnId, updates, performedBy) {
    try {
      const docRef = doc(db, 'fin_transactions', txnId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Transaccion no encontrada');

      const previousValue = { id: snap.id, ...snap.data() };

      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });

      await this._logAction({
        action: 'update_transaction',
        entityType: 'transaction',
        entityId: txnId,
        clientId: previousValue.clientId,
        previousValue,
        newValue: { ...previousValue, ...updates },
        performedBy: performedBy || '',
      });

      return true;
    } catch (e) {
      console.error('Error al actualizar transaccion:', e);
      throw e;
    }
  }

  async getTransaction(txnId) {
    try {
      const docRef = doc(db, 'fin_transactions', txnId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      console.error('Error al obtener transaccion:', e);
      throw e;
    }
  }

  async getAllTransactions() {
    try {
      const q = query(collection(db, 'fin_transactions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener transacciones:', e);
      throw e;
    }
  }

  async getTransactionsByClient(clientId) {
    try {
      const q = query(
        collection(db, 'fin_transactions'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: if composite index not ready, fetch without orderBy
      console.warn('Consulta ordenada falló, usando fallback:', e);
      try {
        const q2 = query(collection(db, 'fin_transactions'), where('clientId', '==', clientId));
        const snap = await getDocs(q2);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      } catch (e2) {
        console.error('Error al obtener transacciones por cliente (fallback):', e2);
        throw e2;
      }
    }
  }

  async getTransactionsByStatus(status) {
    try {
      const q = query(collection(db, 'fin_transactions'), where('status', '==', status));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener transacciones por estado:', e);
      throw e;
    }
  }

  async getOverdueTransactions() {
    try {
      const snap = await getDocs(collection(db, 'fin_transactions'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = new Date().toISOString().split('T')[0];

      const overdue = all.filter(txn =>
        ['por_cobrar', 'pago_parcial'].includes(txn.status) &&
        txn.dueDate &&
        txn.dueDate < today
      );

      if (overdue.length > 0) {
        const batch = writeBatch(db);
        for (const txn of overdue) {
          const docRef = doc(db, 'fin_transactions', txn.id);
          batch.update(docRef, { status: 'atrasado', updatedAt: new Date().toISOString() });
          txn.status = 'atrasado';
        }
        await batch.commit();
      }

      return overdue;
    } catch (e) {
      console.error('Error al obtener transacciones atrasadas:', e);
      throw e;
    }
  }

  async recalculateTransactionStatus(txnId) {
    try {
      const docRef = doc(db, 'fin_transactions', txnId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Transaccion no encontrada');

      const data = snap.data();
      const { amountPaid, totalAmount, dueDate } = data;
      let newStatus;

      if (amountPaid >= totalAmount) {
        newStatus = 'cobrado';
      } else if (amountPaid > 0) {
        newStatus = 'pago_parcial';
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (dueDate && dueDate < today) {
          newStatus = 'atrasado';
        } else {
          newStatus = 'por_cobrar';
        }
      }

      if (newStatus !== data.status) {
        await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
      }

      return newStatus;
    } catch (e) {
      console.error('Error al recalcular estado de transaccion:', e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PAYMENTS
  // ═══════════════════════════════════════════════════════════

  async recordPayment({ transactionId, clientId, amount, method, reference, notes, createdBy }) {
    try {
      // 1. Read the transaction first
      const txnRef = doc(db, 'fin_transactions', transactionId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) throw new Error('Transaccion no encontrada para registrar pago');

      const txnData = txnSnap.data();
      const paymentAmount = Number(amount);
      const newAmountPaid = (txnData.amountPaid || 0) + paymentAmount;
      const newPendingAmount = txnData.totalAmount - newAmountPaid;
      const now = new Date().toISOString();

      // Compute new status
      let newStatus;
      if (newAmountPaid >= txnData.totalAmount) {
        newStatus = 'cobrado';
      } else if (newAmountPaid > 0) {
        newStatus = 'pago_parcial';
      } else {
        newStatus = txnData.status;
      }

      // 2. Build batch for atomicity
      const batch = writeBatch(db);

      // 3. Create payment doc
      const paymentColRef = collection(db, 'fin_payments');
      const paymentDocRef = doc(paymentColRef);
      const paymentData = {
        transactionId,
        clientId,
        amount: paymentAmount,
        method: method || '',
        reference: reference || '',
        notes: notes || '',
        createdBy: createdBy || '',
        createdAt: now,
      };
      batch.set(paymentDocRef, paymentData);

      // 4. Update transaction
      batch.update(txnRef, {
        amountPaid: newAmountPaid,
        pendingAmount: newPendingAmount,
        status: newStatus,
        updatedAt: now,
      });

      // 5. Create audit log entry
      const auditColRef = collection(db, 'fin_audit_log');
      const auditDocRef = doc(auditColRef);
      batch.set(auditDocRef, {
        action: 'record_payment',
        entityType: 'payment',
        entityId: paymentDocRef.id,
        clientId,
        previousValue: {
          amountPaid: txnData.amountPaid,
          pendingAmount: txnData.pendingAmount,
          status: txnData.status,
        },
        newValue: {
          amountPaid: newAmountPaid,
          pendingAmount: newPendingAmount,
          status: newStatus,
          paymentAmount,
        },
        performedBy: createdBy || '',
        timestamp: now,
      });

      // 6. Commit batch
      await batch.commit();

      return { id: paymentDocRef.id, ...paymentData };
    } catch (e) {
      console.error('Error al registrar pago:', e);
      throw e;
    }
  }

  async getPaymentsByTransaction(txnId) {
    try {
      const q = query(
        collection(db, 'fin_payments'),
        where('transactionId', '==', txnId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: if composite index not ready, fetch without orderBy
      console.warn('Consulta ordenada de pagos falló, usando fallback:', e);
      try {
        const q2 = query(collection(db, 'fin_payments'), where('transactionId', '==', txnId));
        const snap = await getDocs(q2);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      } catch (e2) {
        console.error('Error al obtener pagos por transaccion (fallback):', e2);
        throw e2;
      }
    }
  }

  async getPaymentsByClient(clientId) {
    try {
      const q = query(
        collection(db, 'fin_payments'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: if composite index not ready, fetch without orderBy
      console.warn('Consulta ordenada de pagos por cliente falló, usando fallback:', e);
      try {
        const q2 = query(collection(db, 'fin_payments'), where('clientId', '==', clientId));
        const snap = await getDocs(q2);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      } catch (e2) {
        console.error('Error al obtener pagos por cliente (fallback):', e2);
        throw e2;
      }
    }
  }

  async getAllPayments() {
    try {
      const q = query(collection(db, 'fin_payments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener todos los pagos:', e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  AUDIT LOG
  // ═══════════════════════════════════════════════════════════

  async _logAction({ action, entityType, entityId, clientId, previousValue, newValue, performedBy }) {
    try {
      const colRef = collection(db, 'fin_audit_log');
      await addDoc(colRef, {
        action,
        entityType,
        entityId,
        clientId: clientId || '',
        previousValue: previousValue || null,
        newValue: newValue || null,
        performedBy: performedBy || '',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Error al registrar en bitacora de auditoria:', e);
      throw e;
    }
  }

  async getAuditLog(entityId) {
    try {
      const q = query(
        collection(db, 'fin_audit_log'),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: if composite index not ready, fetch without orderBy
      console.warn('Consulta ordenada de auditoria falló, usando fallback:', e);
      try {
        const q2 = query(collection(db, 'fin_audit_log'), where('entityId', '==', entityId));
        const snap = await getDocs(q2);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return docs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      } catch (e2) {
        console.error('Error al obtener auditoria por entidad (fallback):', e2);
        throw e2;
      }
    }
  }

  async getFullAuditLog() {
    try {
      const q = query(collection(db, 'fin_audit_log'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener bitacora de auditoria completa:', e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  KPIs
  // ═══════════════════════════════════════════════════════════

  async getMonthlyIncome(year, month) {
    try {
      const snap = await getDocs(collection(db, 'fin_payments'));
      const payments = snap.docs.map(d => d.data());

      const total = payments.reduce((sum, p) => {
        if (!p.createdAt) return sum;
        const date = new Date(p.createdAt);
        if (date.getFullYear() === year && (date.getMonth() + 1) === month) {
          return sum + Number(p.amount || 0);
        }
        return sum;
      }, 0);

      return total;
    } catch (e) {
      console.error('Error al calcular ingreso mensual:', e);
      throw e;
    }
  }

  async getPendingTotal() {
    try {
      const snap = await getDocs(collection(db, 'fin_transactions'));
      const all = snap.docs.map(d => d.data());

      const total = all.reduce((sum, txn) => {
        if (['por_cobrar', 'pago_parcial'].includes(txn.status)) {
          return sum + Number(txn.pendingAmount || 0);
        }
        return sum;
      }, 0);

      return total;
    } catch (e) {
      console.error('Error al calcular total pendiente:', e);
      throw e;
    }
  }

  async getOverdueTotal() {
    try {
      const snap = await getDocs(collection(db, 'fin_transactions'));
      const all = snap.docs.map(d => d.data());

      const total = all.reduce((sum, txn) => {
        if (txn.status === 'atrasado') {
          return sum + Number(txn.pendingAmount || 0);
        }
        return sum;
      }, 0);

      return total;
    } catch (e) {
      console.error('Error al calcular total atrasado:', e);
      throw e;
    }
  }

  async getProjections(days) {
    try {
      const snap = await getDocs(collection(db, 'fin_transactions'));
      const all = snap.docs.map(d => d.data());

      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      let recurring = 0;
      let oneTime = 0;

      for (const txn of all) {
        if (txn.status === 'cobrado') continue;

        if (txn.type === 'recurrente' && txn.recurrenceDay) {
          // Calculate how many occurrences of recurrenceDay fall within the next N days
          const recDay = Number(txn.recurrenceDay);
          let cursor = new Date(now);
          cursor.setDate(1); // start from beginning of current month

          let occurrences = 0;
          for (let m = 0; m < Math.ceil(days / 28) + 2; m++) {
            const checkDate = new Date(cursor.getFullYear(), cursor.getMonth() + m, recDay);
            if (checkDate > now && checkDate <= endDate) {
              occurrences++;
            }
          }
          recurring += Number(txn.pendingAmount || 0) * occurrences;
        } else {
          // One-time: include if dueDate is within range, or if no dueDate just include the pending
          if (txn.dueDate) {
            const due = new Date(txn.dueDate);
            if (due <= endDate) {
              oneTime += Number(txn.pendingAmount || 0);
            }
          } else {
            oneTime += Number(txn.pendingAmount || 0);
          }
        }
      }

      return {
        total: recurring + oneTime,
        recurring,
        oneTime,
      };
    } catch (e) {
      console.error('Error al calcular proyecciones:', e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount);
  }
}

export default new FinanceService();
