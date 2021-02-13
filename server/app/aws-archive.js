import pkg from "aws-sdk";
const { S3 } = pkg;

const bucket = new S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const sendResultsToAwsArchive = (chains, wordPack) => {
    const payload = {
        date: new Date(),
        wordPack,
        players: chains.length,
        chains: chains.map(({ links }) =>
            links.map(({ type, data }) => ({ type, data }))
        ),
    };
    const [folder, file] = payload.date.toISOString().split("T");

    bucket.upload(
        {
            Bucket: "drawphone",
            Key: `${folder}/${file}-${rand()}.json`,
            Body: JSON.stringify(payload),
            ContentType: "application/json",
            StorageClass: "STANDARD_IA",
        },
        (err) => {
            if (err) {
                throw err;
            }
        }
    );
};

// random 4 digit, just for fun
const rand = () => Math.round(Math.random() * 10000);

export { sendResultsToAwsArchive };
