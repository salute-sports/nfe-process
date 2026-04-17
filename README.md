# NFE Processor – Fullstack (Next.js + FastAPI)

## Estrutura

- **frontend/**: Next.js (App Router, TypeScript, Tailwind CSS)
  - `app/`, `components/`, `lib/`, `services/`, `types/`, `api/`, `public/`
- **backend/**: FastAPI (Python)

## Como rodar localmente

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Deploy na Vercel
- Frontend: Deploy padrão Next.js
- Backend: vercel-python ou handler ASGI (vercel.json incluso)

## Fluxo
1. Upload do XML pelo frontend
2. Envio para API Python
3. Extração dos dados
4. Exibição dos dados extraídos

## Design
- Mantenha o visual do projeto anterior (cores, fontes, componentes, UX)
- Use Tailwind CSS e tokens de design

## Exemplos de integração
Veja exemplos de requisição no código dos serviços frontend.

---
Documentação completa nos arquivos de cada serviço e componente.
