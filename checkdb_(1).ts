import { db } from './server/lib/firebase.js';
async function main() {
  const usuarios = await db.collection('usuarios').get();
  console.log(`usuarios collection: ${usuarios.size}`);
  usuarios.forEach(doc => {
    console.log(doc.data().email, doc.data().nome_completo, doc.data().name);
  });
}
main().catch(console.error);
