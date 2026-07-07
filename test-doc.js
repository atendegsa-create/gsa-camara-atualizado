import 'dotenv/config';

async function run() {
    const documentId = "102ed40fa8991ac486ef96d28fa0"; // the one we created
    const res = await fetch(`https://api.assinafy.com.br/v1/documents/${documentId}`, {
        headers: {
            "Authorization": `Bearer ${process.env.ASSINAFY_API_KEY}`
        }
    });
    console.log(res.status, await res.text());
}
run();
