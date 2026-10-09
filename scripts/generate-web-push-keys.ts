import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("WEB_PUSH_PUBLIC_KEY=" + publicKey);
console.log("WEB_PUSH_PRIVATE_KEY=" + privateKey);
console.log("WEB_PUSH_SUBJECT=mailto:notifications@example.com");
console.log("");
console.log("Copiez ces valeurs dans les variables secrètes de votre environnement. Ne versionnez jamais la clé privée.");
