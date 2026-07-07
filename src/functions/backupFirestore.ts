import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Automate Daily Backups
 * Runs every day at 03:00 AM.
 * Dumps the entire Firestore database to Google Cloud Storage.
 */
export const backupFirestore = functions.pubsub.schedule('0 3 * * *')
  .timeZone('America/Sao_Paulo') // Use your target timezone
  .onRun(async (context) => {
    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
      if (!projectId) {
         throw new Error("Project ID is missing from environment.");
      }
      const databaseName = client.databasePath(projectId, '(default)');
      const bucketName = 'gs://gsa-backups-diarios';

      console.log(`Starting Firestore backup for database: ${databaseName} to bucket: ${bucketName}`);

      const response = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucketName,
        // Leave collectionIds empty to export all collections
        collectionIds: []
      });

      console.log(`Backup operation gracefully started: ${response[0].name}`);

    } catch (error) {
      console.error('Error triggering Firestore backup', error);
      throw error;
    }
});
