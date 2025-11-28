const { ApifyClient } = require('apify-client');

export default async function handler(req, res) {
    // CORS : Autorise ton site à parler au serveur
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Pour le test. Lundi on mettra 'https://www.match-drive.com'
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.body;
    const token = process.env.APIFY_TOKEN; // La clé sera stockée dans Vercel

    if (!token) return res.status(500).json({ error: 'Token API manquant' });
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    const client = new ApifyClient({ token: token });

    try {
        // Lancement du Scraper Mobile.de (Actor: 5rqwyghNIbO6VMnlX)
        // On utilise une config simplifiée pour aller vite
        const run = await client.actor("5rqwyghNIbO6VMnlX").call({
            startUrls: [{ url: url }],
            maxItems: 1,
            proxyConfiguration: { useApifyProxy: true } // Indispensable pour mobile.de
        });

        // Récupération des données
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items.length === 0) return res.status(404).json({ error: 'Aucune voiture trouvée' });

        const car = items[0];

        // Nettoyage des données pour ton frontend
        // Note: Apify renvoie parfois des champs différents selon l'annonce. On sécurise.
        const cleanData = {
            titre: car.title || "Véhicule Import",
            prix: car.price || 0,
            co2: car.emissionsCO2 || 150, // Valeur refuge
            cv: car.powerKW ? Math.round(car.powerKW * 1.36 / 10) : 10, // Calcul CV approx (kW * 1.36 / 10)
            date: car.firstRegistration || "2020-01",
            image: car.images ? car.images[0] : null
        };

        res.status(200).json(cleanData);

    } catch (error) {
        console.error("Erreur Apify:", error);
        res.status(500).json({ error: error.message });
    }
}
