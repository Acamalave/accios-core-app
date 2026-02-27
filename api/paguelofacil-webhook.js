const admin = require('firebase-admin');

// Initialize firebase-admin only once
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;
    // PagueloFacil sends: { status, amount, reference, transactionId, clientId, ... }

    const status = payload.status || payload.data?.status;
    const amount = Number(payload.amount || payload.data?.amount || 0);
    const reference = payload.reference || payload.data?.reference || '';
    const transactionIds = payload.transactionIds || payload.data?.transactionIds || [];

    if (status !== 'approved' && status !== 'APROBADA') {
      return res.status(200).json({ message: 'Payment not approved, skipping' });
    }

    // Process each transaction
    for (const txnId of transactionIds) {
      const txnRef = db.collection('fin_transactions').doc(txnId);
      const txnSnap = await txnRef.get();
      if (!txnSnap.exists) continue;

      const txnData = txnSnap.data();
      const newAmountPaid = (txnData.amountPaid || 0) + amount;
      const newPendingAmount = txnData.totalAmount - newAmountPaid;
      const now = new Date().toISOString();

      let newStatus;
      if (newAmountPaid >= txnData.totalAmount) {
        newStatus = 'cobrado';
      } else if (newAmountPaid > 0) {
        newStatus = 'pago_parcial';
      } else {
        newStatus = txnData.status;
      }

      const batch = db.batch();

      // Create payment record
      const paymentRef = db.collection('fin_payments').doc();
      batch.set(paymentRef, {
        transactionId: txnId,
        clientId: txnData.clientId,
        amount,
        method: 'paguelofacil',
        reference,
        notes: 'Pago automatico via PagueloFacil',
        createdBy: 'webhook',
        createdAt: now
      });

      // Update transaction
      batch.update(txnRef, {
        amountPaid: newAmountPaid,
        pendingAmount: newPendingAmount,
        status: newStatus,
        updatedAt: now
      });

      // Audit log
      const auditRef = db.collection('fin_audit_log').doc();
      batch.set(auditRef, {
        action: 'payment_received',
        entityType: 'payment',
        entityId: paymentRef.id,
        clientId: txnData.clientId,
        previousValue: { amountPaid: txnData.amountPaid, status: txnData.status },
        newValue: { amountPaid: newAmountPaid, status: newStatus, paymentAmount: amount },
        performedBy: 'webhook',
        timestamp: now
      });

      await batch.commit();
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Error processing webhook' });
  }
};
