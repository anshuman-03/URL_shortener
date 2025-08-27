import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import { fileURLToPath } from "url";
import path from "path";


const __filename = fileURLToPath(import.meta.url);// use this to save all the urls into the same data.json file not into different.
const __dirname = path.dirname(__filename);

const PORT = 5000;
const DATA_FILE = path.join(__dirname,"data", "data.json");

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("404 Page not Found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {                        // ENOENt > ERROR NOT ENTRY .. only if the file is not present 
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
    console.log(req.url);

    if (req.method === 'GET') {
        if (req.url === "/favicon.ico") {
            res.writeHead(204); // No Content
            return res.end();
        }

        if (req.url === "/") {
            return serveFile(res, path.join("public", "index.html"), "text/html");
        } else if (req.url === "/style.css") {
            return serveFile(res, path.join("public", "style.css"), "text/css");
        } else if (req.url === "/links") {
            const links = await loadLinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            console.log("links redirected", req.url);
            if (links[shortCode]) {
                res.writeHead(302, { Location: links[shortCode] });// links[shortcode] ko actual url jo hoga waha pe redirect krdega !
                return res.end();
            } else {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Shortened URL is not found");
            }
        }

    }

    if (req.method === "POST" && req.url === '/shorten') {

        const links = await loadLinks();

        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on("end", async () => {
            console.log(body);
            const { url, shortCode } = JSON.parse(body);

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL is requied");
            }

            const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex"); //to generate random shortcode
            //for checkinhg duplicacy

            if (links[finalShortCode]) {
                res.writeHead(400, { "Content-Type": "text/plain" })
                return res.end("Short code already exist. Please choose another.");
            }

            links[finalShortCode] = url;
            await saveLinks(links);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
        });
    }
});

server.listen(PORT,"0.0.0.0", () => {
    console.log(`Server runnning at http://localhost:${PORT}`);
})