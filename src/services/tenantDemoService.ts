/**
 * tenantDemoService — PRODUCTION LOCKED
 *
 * All demo data seeding, reset commands, sandbox provisioning, rollbacks, and
 * sample data generation have been permanently disabled in the production build.
 *
 * DO NOT re-enable these functions. The system is in PRODUCTION MODE.
 */

const PROD_ERROR = new Error(
  '[DukaPos PRODUCTION LOCK] Demo data operations are permanently disabled in the production environment.'
);

export const tenantDemoService = {
  async seedDemoData(_tenantId: string, _branchId: string, _moduleType: string) {
    throw PROD_ERROR;
  },
  async purgeTenantDemoRecords(_tenantId: string) {
    throw PROD_ERROR;
  },
  async createResetCommand(_tenantId: string, _userId: string, _clearType: string) {
    throw PROD_ERROR;
  },
  async processResetCommands() {
    throw PROD_ERROR;
  },
  async restoreRollback(_cmdId: string) {
    throw PROD_ERROR;
  },
  async convertToProduction(_tenantId: string, _userId: string) {
    throw PROD_ERROR;
  },
};
