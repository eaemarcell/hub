import json
import os
import re
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import pdfplumber

PORT = 8000
DATA_DIR = os.path.dirname(__file__)
APPS_FILE = os.path.join(DATA_DIR, 'apps.json')
ESCALA_FILE = os.path.join(DATA_DIR, 'escala.json')

DEFAULT_APPS = [
    {"id": "sighe", "name": "SIGHE", "url": "/sighe/", "icon": "clock", "color": "blue", "isLocal": True, "isDefault": True},
    {"id": "pfviewer", "name": "pfViewer", "url": "/pfviewer/", "icon": "shield-check", "color": "blue", "isLocal": True, "isDefault": True}
]

def load_apps():
    if not os.path.exists(APPS_FILE):
        save_apps(DEFAULT_APPS)
        return DEFAULT_APPS
    try:
        with open(APPS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_APPS

def save_apps(apps):
    try:
        with open(APPS_FILE, 'w', encoding='utf-8') as f:
            json.dump(apps, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Erro ao salvar apps: {e}")

def parse_escala_pdf(pdf_path):
    escala = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines = text.split('\n')
                for line in lines:
                    match = re.search(r'(\d{2}/\d{2}).*?(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+\d{1,2}:\d{2}\s+([A-Za-zÀ-ÿ\s]+)', line)
                    if match:
                        data_str, inicio, fim, tecnico = match.groups()
                        tecnico_clean = tecnico.strip()
                        
                        dia_semana = ""
                        m_dia = re.search(r'(seg|ter|qua|qui|sex|sáb|sàb|dom)', line, re.IGNORECASE)
                        if m_dia:
                            dia_semana = m_dia.group(1).lower()

                        if tecnico_clean and "Total" not in tecnico_clean:
                            escala.append({
                                "data": data_str.strip(),
                                "dia_semana": dia_semana,
                                "inicio": inicio.strip(),
                                "fim": fim.strip(),
                                "tecnico": tecnico_clean
                            })

        with open(ESCALA_FILE, 'w', encoding='utf-8') as f:
            json.dump(escala, f, ensure_ascii=False, indent=2)
            
        print(f"Sucesso: {len(escala)} turnos extraídos do PDF.")
    except Exception as e:
        print(f"Erro ao ler PDF: {e}")
    return escala

def get_status_sa():
    if not os.path.exists(ESCALA_FILE):
        return {"sa_atual": [], "proximo_sa": None}
    
    try:
        with open(ESCALA_FILE, 'r', encoding='utf-8') as f:
            escala = json.load(f)
        
        hoje_dt = datetime.now()
        hoje_str = hoje_dt.strftime('%d/%m')
        
        sa_atual = []
        proximos = []
        
        for item in escala:
            if item['data'] == hoje_str:
                sa_atual.append(item)
            elif item['data'] > hoje_str:
                proximos.append(item)
                
        proximo_sa = proximos[0] if proximos else None
        
        return {
            "data_hoje": hoje_dt.strftime('%d/%m/%Y'),
            "sa_atual": sa_atual,
            "proximo_sa": proximo_sa
        }
    except Exception as e:
        print(f"Erro no status do SA: {e}")
        return {"sa_atual": [], "proximo_sa": None}

class PortalHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        clean_path = self.path.split('?')[0]
        if clean_path in ['/api/apps', '/api/apps/']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(load_apps(), ensure_ascii=False).encode('utf-8'))

        elif clean_path in ['/api/escala/status', '/api/escala/status/']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(get_status_sa(), ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0]
        if clean_path in ['/api/apps', '/api/apps/']:
            try:
                length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(length)
                new_apps = json.loads(post_data.decode('utf-8'))
                if isinstance(new_apps, list):
                    save_apps(new_apps)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(400, "Formato inválido.")
            except Exception as e:
                self.send_error(500, f"Erro no salvamento: {e}")

        elif clean_path in ['/api/escala/upload', '/api/escala/upload/']:
            try:
                length = int(self.headers.get('Content-Length', 0))
                pdf_data = self.rfile.read(length)
                
                pdf_path = os.path.join(DATA_DIR, 'escala_atual.pdf')
                with open(pdf_path, 'wb') as f:
                    f.write(pdf_data)
                
                escala = parse_escala_pdf(pdf_path)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "total_items": len(escala)}).encode('utf-8'))
            except Exception as e:
                print(f"Erro no Upload: {e}")
                self.send_error(500, f"Erro interno ao salvar PDF: {e}")
        else:
            self.send_error(404, "Rota não encontrada.")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), PortalHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()