// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm i node-fetch@2
const app = express();
app.use(express.json({limit:'10mb'}));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "username/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
if(!GITHUB_TOKEN || !GITHUB_REPO){
  console.warn("GITHUB_TOKEN or GITHUB_REPO not set - save to GitHub disabled");
}

async function getFileSha(path){
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent':'save-script' } });
  if(res.status===200){
    const j = await res.json();
    return j.sha;
  }
  return null;
}

app.post('/api/save-json', async (req,res)=>{
  if(!GITHUB_TOKEN || !GITHUB_REPO) return res.status(500).send({error:'server not configured'});
  const { path, content, message } = req.body;
  if(!path || !content) return res.status(400).send({error:'missing fields'});
  const b64 = Buffer.from(content).toString('base64');
  try{
    const sha = await getFileSha(path);
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    const body = {
      message: message || `Update ${path} via save-api`,
      content: b64,
      branch: GITHUB_BRANCH
    };
    if(sha) body.sha = sha;
    const r = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent':'save-script', 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(r.ok) return res.json(j);
    else return res.status(r.status).json(j);
  }catch(err){
    console.error(err);
    res.status(500).send({error:err.message});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log("Server listening on",port));