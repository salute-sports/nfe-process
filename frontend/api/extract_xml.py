from http.server import BaseHTTPRequestHandler
import io
import json
import cgi
import pandas as pd
from lxml import etree
from datetime import datetime
import openpyxl


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_type = self.headers.get('Content-Type', '')
            ctype, pdict = cgi.parse_header(content_type)
            if 'boundary' in pdict:
                if isinstance(pdict['boundary'], str):
                    pdict['boundary'] = pdict['boundary'].encode()
            body_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(body_len)
            form = cgi.parse_multipart(io.BytesIO(body), pdict)
            content = form.get('file', [b''])[0]
            if isinstance(content, str):
                content = content.encode()

            tree = etree.fromstring(content)
            nfe = tree.find('.//{*}NFe') or tree
            infNFe = nfe.find('.//{*}infNFe') or nfe
            emit = infNFe.find('.//{*}emit')
            emitente = emit.find('.//{*}xNome') if emit is not None else None
            numero = infNFe.findtext('.//{*}ide/{*}nNF', default='')
            data_emissao_raw = infNFe.findtext('.//{*}ide/{*}dhEmi', default='') or infNFe.findtext('.//{*}ide/{*}dEmi', default='')
            nome_emit = emitente.text if emitente is not None else ''
            data_emissao = ''
            if data_emissao_raw:
                try:
                    if 'T' in data_emissao_raw:
                        data_emissao = datetime.fromisoformat(data_emissao_raw[:19]).strftime('%d/%m/%Y')
                    else:
                        data_emissao = datetime.strptime(data_emissao_raw, '%Y-%m-%d').strftime('%d/%m/%Y')
                except Exception:
                    data_emissao = data_emissao_raw

            columns = [
                "Código", "Descrição Produto", "SKU", "EAN", "NCM", "Qtde", "Valor Un.", "IPI", "Desc.", "Custo Un."
            ]
            rows = []
            for det in infNFe.findall('.//{*}det'):
                prod = det.find('.//{*}prod')
                imposto = det.find('.//{*}imposto')
                if prod is not None:
                    ipi = 0.0
                    if imposto is not None:
                        ipi_tag = imposto.find('.//{*}IPI')
                        if ipi_tag is not None:
                            vIPI = ipi_tag.findtext('.//{*}vIPI')
                            qCom = prod.findtext('.//{*}qCom')
                            try:
                                ipi = float(vIPI) / float(qCom) if vIPI and qCom and float(qCom) != 0 else 0.0
                            except Exception:
                                ipi = 0.0
                    desc_unit = 0.0
                    vDesc = prod.findtext('.//{*}vDesc')
                    qCom = prod.findtext('.//{*}qCom')
                    try:
                        desc_unit = float(vDesc) / float(qCom) if vDesc and qCom and float(qCom) != 0 else 0.0
                    except Exception:
                        desc_unit = 0.0
                    vUnCom = prod.findtext('.//{*}vUnCom')
                    try:
                        vUnCom_f = float(vUnCom) if vUnCom else 0.0
                    except Exception:
                        vUnCom_f = 0.0
                    custo_unit = vUnCom_f + ipi - desc_unit
                    qtde = int(float(prod.findtext('.//{*}qCom', default='0')))
                    valor_unit = f"{vUnCom_f:,.2f}".replace('.', ',')
                    ipi_str = f"{ipi:,.2f}".replace('.', ',')
                    desc_unit_str = f"{desc_unit:,.2f}".replace('.', ',')
                    custo_unit_str = f"{custo_unit:,.2f}".replace('.', ',')
                    rows.append([
                        prod.findtext('.//{*}cProd', default=''),
                        prod.findtext('.//{*}xProd', default=''),
                        "",
                        prod.findtext('.//{*}cEAN', default=''),
                        prod.findtext('.//{*}NCM', default=''),
                        qtde,
                        valor_unit,
                        ipi_str,
                        desc_unit_str,
                        custo_unit_str
                    ])

            df = pd.DataFrame(rows, columns=columns)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, startrow=4, sheet_name='Produtos')
                workbook = writer.book
                worksheet = writer.sheets['Produtos']
                worksheet['A1'] = 'NÚMERO NF-e'
                worksheet['B1'] = numero
                worksheet['A2'] = 'DATA EMISSAO'
                worksheet['B2'] = data_emissao
                worksheet['A3'] = 'NOME EMITENTE'
                worksheet['B3'] = nome_emit
                for col in worksheet.columns:
                    max_length = 0
                    col_letter = col[0].column_letter
                    for cell in col:
                        try:
                            if cell.value:
                                max_length = max(max_length, len(str(cell.value)))
                        except Exception:
                            pass
                    adjusted_width = max_length + 2
                    worksheet.column_dimensions[col_letter].width = adjusted_width
            output.seek(0)
            excel_data = output.read()
            filename = f"notas_extraidas_{numero or 'nfe'}.xlsx"

            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('Content-Disposition', f'attachment; filename={filename}')
            self.send_header('Content-Length', str(len(excel_data)))
            self.end_headers()
            self.wfile.write(excel_data)

        except Exception as e:
            error_msg = json.dumps({"error": str(e)}).encode()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(error_msg)))
            self.end_headers()
            self.wfile.write(error_msg)
