fetch('http://127.0.0.1:4000/api/health').then(r => r.json()).then(d => console.log('Response:', d)).catch(e => console.error('Error:', e));
