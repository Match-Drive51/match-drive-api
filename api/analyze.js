const { ApifyClient } = require('apify-client');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
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
    // ATTENTION : Token à récupérer
    const token = process.env.APIFY_TOKEN;

    if (!token) return res.status(500).json({ error: 'Token API manquant (Check Vercel Env)' });
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    const client = new ApifyClient({ token: token });

    try {
        const run = await client.actor("5rqwyghNIbO6VMnlX").call({
            startUrls: [{ url: url }],
            maxItems: 1,
            proxyConfiguration: { useApifyProxy: true }
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (!items || items.length === 0) return res.status(404).json({ error: 'Aucune voiture trouvée' });

        const car = items[0];

        const cleanData = {
            titre: car.title || "Véhicule Import",
            prix: car.price || 0,
            co2: car.emissionsCO2 || 150,
            cv: car.powerKW ? Math.round(car.powerKW * 1.36 / 10) : 10,
            date: car.firstRegistration || "2020-01",
            image: car.images ? car.images[0] : null
        };

        res.status(200).json(cleanData);

    } catch (error) {
        console.error("Erreur Apify:", error);
        res.status(500).json({ error: error.message });
    }
};
