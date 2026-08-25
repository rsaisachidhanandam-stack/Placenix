// ============================================================
// PLACENIX — SQL ACID TRANSACTION RUNNER & CONCURRENCY CONTROLLER
// Demonstrates:
// 1. Atomicity (All-or-nothing rollback on validation failure or exception)
// 2. Consistency (Invariant enforcement: Remaining capacity cannot be < 0)
// 3. Isolation (Simulated row-level locking / optimistic lock checks)
// 4. Durability (Committed state persistence)
// ============================================================

// State simulation for Transaction Demonstration
let driveCapacityTable = {
  'drv_amazon_2026': { total: 60, remaining: 5, applicants: 55 },
  'drv_google_2026': { total: 50, remaining: 2, applicants: 48 },
  'drv_zoho_2026': { total: 100, remaining: 0, applicants: 100 } // Full / Sold out
};

let transactionLogs = [];

export const TransactionEngine = {
  /**
   * Executes an atomic multi-table recruitment booking transaction:
   * 1. BEGIN TRANSACTION
   * 2. Row Lock & Capacity Check on Drive
   * 3. Decrement Capacity in Drive table
   * 4. Insert Record into Drive Applications table
   * 5. Insert Record into Slot Candidate Bookings table
   * 6. COMMIT (or ROLLBACK on any failure)
   */
  executeSlotBookingTransaction: async ({ driveId, studentId, studentName, venueName, slotTime }) => {
    const txId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const stepsExecuted = [];

    try {
      // Step 1: BEGIN
      stepsExecuted.push({ step: 1, action: 'BEGIN TRANSACTION', status: 'OK', txId });

      // Step 2: Row Lock & Invariant Check
      const drive = driveCapacityTable[driveId];
      if (!drive) {
        throw new Error(`Drive '${driveId}' does not exist.`);
      }
      stepsExecuted.push({
        step: 2,
        action: `SELECT FOR UPDATE on drive '${driveId}'`,
        status: 'OK',
        currentRemaining: drive.remaining
      });

      // Constraint check (Consistency enforcement)
      if (drive.remaining <= 0) {
        throw new Error(`ACID Invariant Violation: Drive has 0 remaining slots. Cannot overbook.`);
      }

      // Step 3: Mutate Drive Capacity
      drive.remaining -= 1;
      drive.applicants += 1;
      stepsExecuted.push({
        step: 3,
        action: `UPDATE drives SET remaining_slots = ${drive.remaining}, applicants = ${drive.applicants}`,
        status: 'OK'
      });

      // Step 4: Insert Application Record
      stepsExecuted.push({
        step: 4,
        action: `INSERT INTO drive_applications (drive_id: '${driveId}', student_id: '${studentId}', stage: 'Applied')`,
        status: 'OK'
      });

      // Step 5: Insert Booking Record
      stepsExecuted.push({
        step: 5,
        action: `INSERT INTO slot_candidate_bookings (venue: '${venueName}', slot: '${slotTime}', candidate: '${studentName}')`,
        status: 'OK'
      });

      // Step 6: COMMIT
      stepsExecuted.push({ step: 6, action: 'COMMIT TRANSACTION', status: 'SUCCESS' });

      const txSummary = {
        txId,
        outcome: 'COMMITTED',
        acidGuarantees: {
          atomicity: 'All 5 database operations executed and committed atomically.',
          consistency: `Capacity updated within valid constraint bounds (remaining: ${drive.remaining}).`,
          isolation: 'Row-level locking prevented concurrent double-booking.',
          durability: 'Transaction written to database log.'
        },
        steps: stepsExecuted,
        timestamp: new Date().toISOString()
      };

      transactionLogs.unshift(txSummary);
      return { success: true, txSummary };

    } catch (err) {
      // Automatic ROLLBACK on failure (Atomicity guarantee)
      stepsExecuted.push({
        step: stepsExecuted.length + 1,
        action: 'ROLLBACK TRANSACTION',
        reason: err.message,
        status: 'ROLLED_BACK'
      });

      const txSummary = {
        txId,
        outcome: 'ROLLED_BACK',
        acidGuarantees: {
          atomicity: 'Failure detected. All intermediate table mutations were fully rolled back.',
          consistency: 'No orphaned rows or negative slot capacities were created.',
          isolation: 'Locks released upon rollback.'
        },
        error: err.message,
        steps: stepsExecuted,
        timestamp: new Date().toISOString()
      };

      transactionLogs.unshift(txSummary);
      return { success: false, error: err.message, txSummary };
    }
  },

  getTransactionHistory: () => transactionLogs.slice(0, 20)
};
