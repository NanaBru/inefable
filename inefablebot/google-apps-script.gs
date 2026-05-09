/**
 * code.gs — Google Apps Script para InefableBot CRM
 * 
 * INSTRUCCIONES:
 * 1. En tu Google Sheet: Extensiones -> Apps Script.
 * 2. Borrá todo y pegá este código.
 * 3. Dale a "Implementar" -> "Nueva implementación".
 * 4. Tipo: "Aplicación web".
 * 5. Ejecutar como: "Tú" (tu mail).
 * 6. Quién tiene acceso: "Cualquier persona" (usaremos un TOKEN para seguridad).
 * 7. Copiá la "URL de la aplicación web". La usaremos en el Cloudflare Worker.
 */

const APP_TOKEN = "todolopuedoencristoquemefortalece"; 


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents); 
    
    // Verificación de seguridad básica
    if (data.token !== APP_TOKEN) {
      return response({ error: "No autorizado" }, 401);
    }

    const action = data.action;

    if (action === "listTabs") {
      const tabs = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName());
      return response(tabs);
    }

    if (action === "readData") {
      const sheetName = data.tab;
      const sheet = sheetName ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName) : SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      
      if (!sheet) return response({ error: "Hoja no encontrada" }, 404);
      
      const values = sheet.getDataRange().getValues();
      if (values.length < 1) return response([]);

      const headers = values[0];
      const rows = values.slice(1);

      const result = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      });

      return response(result);
    }

    if (action === "addRow") {
      const { datos, tab } = data; // datos es un objeto { columna: valor }
      const sheet = tab ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab) : SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      
      if (!sheet) return response({ error: "Hoja no encontrada" }, 404);

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(h => datos[h] ?? "");
      
      sheet.appendRow(newRow);
      return response({ ok: true, message: "Registro creado al final de la lista", fila: sheet.getLastRow() });
    }

    if (action === "updateCell") {
      const { fila, columna, nuevoValor, tab } = data;
      const sheet = tab ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab) : SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      
      if (!sheet) return response({ error: "Hoja no encontrada" }, 404);

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const colIndex = headers.indexOf(columna);

      if (colIndex === -1) return response({ error: "Columna no encontrada" }, 404);

      // Fila + 1 porque fila 1 es header. ColIndex + 1 porque GAS es 1-indexed.
      sheet.getRange(Number(fila) + 1, colIndex + 1).setValue(nuevoValor);

      return response({ ok: true, message: "Celda actualizada" });
    }

    return response({ error: "Acción no válida" }, 400);

  } catch (err) {
    return response({ error: err.toString() }, 500);
  }
}

function response(obj, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}






