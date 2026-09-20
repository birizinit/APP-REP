import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n  Chaves VAPID geradas. Cole no seu .env:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log('VAPID_SUBJECT="mailto:voce@seudominio.com.br"\n');
