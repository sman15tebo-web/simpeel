let cropper = null;
let currentPreviewId = '';

function workbookPreviewHtml(workbook) {
    const isSheetJs = Array.isArray(workbook.SheetNames);
    const worksheets = isSheetJs
        ? workbook.SheetNames.map(name => ({
            name,
            rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' })
        }))
        : workbook.worksheets;
    const content = worksheets.map(worksheet => {
        let rows;
        if (isSheetJs) {
            rows = worksheet.rows.map(row => row.map(value => String(value ?? '')));
        } else {
            rows = [];
            for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
                const row = worksheet.getRow(rowNumber);
                const cells = [];
                for (let colNumber = 1; colNumber <= worksheet.columnCount; colNumber++) {
                    const value = row.getCell(colNumber).value;
                    let text = '';
                    if (value !== null && value !== undefined) {
                        if (typeof value === 'object') {
                            if (Array.isArray(value.richText)) text = value.richText.map(part => part.text).join('');
                            else if (value.result !== undefined) text = String(value.result);
                            else if (value.text !== undefined) text = String(value.text);
                        } else {
                            text = String(value);
                        }
                    } else {
                        text = '';
                    }
                    cells.push(text);
                }
                rows.push(cells);
            }
        }

        const rowsPerPage = 24;
        const worksheetMerges = isSheetJs ? [] : [
            ...(Array.isArray(worksheet.model?.merges) ? worksheet.model.merges : []),
            ...Object.keys(worksheet._merges || {})
        ];
        const mergeRanges = [...new Set(worksheetMerges)].map(range => {
                const match = String(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
                if (!match) return null;
                const colNumber = letters => [...letters.toUpperCase()].reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0);
                return {
                    startRow: Number(match[2]),
                    startCol: colNumber(match[1]),
                    endRow: Number(match[4]),
                    endCol: colNumber(match[3])
                };
            }).filter(Boolean);
        const pageRanges = [];
        let pageStart = 1;
        while (pageStart <= rows.length) {
            let pageEnd = Math.min(rows.length, pageStart + rowsPerPage - 1);
            let extended;
            do {
                extended = false;
                mergeRanges.forEach(range => {
                    if (range.startRow <= pageEnd && range.endRow > pageEnd) {
                        pageEnd = range.endRow;
                        extended = true;
                    }
                });
            } while (extended);
            pageRanges.push({ start: pageStart, end: pageEnd });
            pageStart = pageEnd + 1;
        }
        const pageCount = Math.max(1, pageRanges.length);
        const pages = [];
        for (let page = 0; page < pageCount; page++) {
            const { start, end } = pageRanges[page] || { start: 1, end: 0 };
            const tableRows = rows.slice(start - 1, end).map((cells, index) => {
                const rowNumber = start + index;
                const isHeader = rowNumber === 5 || (rowNumber === 1 && rows.length <= 2);
                const tag = isHeader ? 'th' : 'td';
                const renderedCells = [];
                for (let colNumber = 1; colNumber <= cells.length; colNumber++) {
                    const containingMerge = mergeRanges.find(range =>
                        rowNumber >= range.startRow && rowNumber <= range.endRow &&
                        colNumber >= range.startCol && colNumber <= range.endCol
                    );
                    if (containingMerge && (rowNumber !== containingMerge.startRow || colNumber !== containingMerge.startCol)) {
                        continue;
                    }
                    const cell = cells[colNumber - 1] || '';
                    const spanAttributes = containingMerge
                        ? ` colspan="${containingMerge.endCol - containingMerge.startCol + 1}" rowspan="${containingMerge.endRow - containingMerge.startRow + 1}"`
                        : '';
                    let inlineStyle = '';
                    if (!isSheetJs) {
                        const sourceCell = worksheet.getCell(rowNumber, colNumber);
                        const styles = [];
                        const borderStyle = {
                            thin: '1px solid',
                            medium: '2px solid',
                            thick: '3px solid',
                            hair: '1px solid',
                            dotted: '1px dotted',
                            dashed: '1px dashed',
                            double: '3px double',
                            dashDot: '1px dashed',
                            mediumDashed: '2px dashed',
                            mediumDashDot: '2px dashed',
                            mediumDashDotDot: '2px dashed',
                            slantDashDot: '1px dashed'
                        };
                        for (const side of ['top', 'right', 'bottom', 'left']) {
                            const border = sourceCell.border?.[side];
                            if (!border?.style) continue;
                            const color = border.color?.argb ? `#${border.color.argb.slice(-6)}` : '#777';
                            styles.push(`border-${side}:${borderStyle[border.style] || '1px solid'} ${color}`);
                        }
                        if (sourceCell.alignment?.horizontal) styles.push(`text-align:${sourceCell.alignment.horizontal}`);
                        if (sourceCell.alignment?.vertical) styles.push(`vertical-align:${sourceCell.alignment.vertical}`);
                        if (sourceCell.font?.bold) styles.push('font-weight:bold');
                        if (sourceCell.font?.underline) styles.push('text-decoration:underline');
                        if (sourceCell.font?.size) styles.push(`font-size:${sourceCell.font.size}pt`);
                        const fillColor = sourceCell.fill?.fgColor?.argb;
                        if (fillColor) styles.push(`background-color:#${fillColor.slice(-6)}`);
                        if (styles.length) inlineStyle = ` style="${styles.join(';')}"`;
                    }
                    renderedCells.push(`<${tag}${spanAttributes}${inlineStyle}>${escapePreviewHtml(cell).replace(/\n/g, '<br>')}</${tag}>`);
                }
                return `<tr>${renderedCells.join('')}</tr>`;
            }).join('');
            pages.push(`<section class="sheet"><div class="sheet-heading">${escapePreviewHtml(worksheet.name)} — Halaman ${page + 1} dari ${pageCount}</div><table>${tableRows}</table></section>`);
        }
        return pages.join('');
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;padding:20px;background:#e5e7eb;font:11px Arial,sans-serif;color:#222}
        .sheet{width:11in;min-height:8.5in;margin:0 auto 20px;padding:.35in;background:#fff;box-shadow:0 2px 12px #0002;page-break-after:always;overflow:hidden}
        .sheet-heading{font-weight:bold;margin-bottom:8px;color:#444}table{width:100%;border-collapse:collapse;table-layout:auto}
        th,td{border:0;padding:4px;vertical-align:top;overflow-wrap:anywhere}
        th{background:#d3d3d3;text-align:center} @media print{body{padding:0;background:#fff}.sheet{width:11in;height:8.5in;min-height:0;margin:0;padding:.35in;box-shadow:none;overflow:hidden}.sheet:last-child{page-break-after:auto}}
    </style></head><body>${content}</body></html>`;
}

function escapePreviewHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function documentPreviewHtml(html) {
    const previewStyles = `<style>
        @media screen {
            html{background:#e5e7eb}
            body{margin:0!important;padding:18px!important;background:#e5e7eb!important}
            .Section1,.Section2{box-sizing:border-box;background:#fff;margin:0 auto 18px!important;padding:15mm!important;box-shadow:0 2px 12px #0002}
            .Section1{width:210mm;min-height:297mm}
            .Section2{width:297mm;min-height:210mm}
        }
        @media print {
            body{padding:0!important;background:#fff!important}
            .Section1,.Section2{box-shadow:none!important;margin:0!important}
        }
    </style>`;
    return html.includes('</head>') ? html.replace('</head>', `${previewStyles}</head>`) : `${previewStyles}${html}`;
}

function openFilePreview({ fileName, blob, html, mimeType }) {
    let modal = document.getElementById('filePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'filePreviewModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title text-truncate" id="filePreviewTitle"></h5>
                        <div class="d-flex align-items-center gap-2 ms-auto me-3">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-preview-zoom="out" aria-label="Perkecil">−</button>
                            <span id="filePreviewZoom" class="small">100%</span>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-preview-zoom="in" aria-label="Perbesar">+</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-preview-zoom="reset">Reset</button>
                            <button type="button" class="btn btn-sm btn-outline-primary" id="filePreviewDownload"><i class="fas fa-download me-1"></i>Unduh</button>
                            <button type="button" class="btn btn-sm btn-primary" id="filePreviewPrint"><i class="fas fa-print me-1"></i>Cetak / PDF</button>
                        </div>
                        <button type="button" class="btn-close ms-0" data-bs-dismiss="modal" aria-label="Tutup"></button>
                    </div>
                    <div class="modal-body p-0"><iframe title="Pratinjau dokumen" id="filePreviewFrame" class="file-preview-frame" style="width:100%;height:calc(100vh - 58px);border:0;background:#e5e7eb"></iframe></div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-preview-zoom]').forEach(button => {
            button.addEventListener('click', () => {
                const frame = document.getElementById('filePreviewFrame');
                const direction = button.dataset.previewZoom;
                let zoom = Number(frame.dataset.zoom || 100);
                zoom = direction === 'reset' ? 100 : zoom + (direction === 'in' ? 10 : -10);
                zoom = Math.max(50, Math.min(200, zoom));
                frame.dataset.zoom = String(zoom);
                document.getElementById('filePreviewZoom').textContent = `${zoom}%`;
                if (frame.contentDocument?.body) frame.contentDocument.body.style.zoom = `${zoom}%`;
            });
        });
        modal.addEventListener('hidden.bs.modal', () => {
            document.getElementById('filePreviewFrame').srcdoc = '';
            document.getElementById('filePreviewFrame').dataset.zoom = '100';
            document.getElementById('filePreviewZoom').textContent = '100%';
            if (modal._previewObjectUrl) URL.revokeObjectURL(modal._previewObjectUrl);
            modal._previewObjectUrl = null;
        });
    }

    const frame = document.getElementById('filePreviewFrame');
    if (modal._previewObjectUrl) URL.revokeObjectURL(modal._previewObjectUrl);
    const objectUrl = URL.createObjectURL(blob);
    modal._previewObjectUrl = objectUrl;
    document.getElementById('filePreviewTitle').textContent = fileName;
    frame.dataset.zoom = '100';
    document.getElementById('filePreviewZoom').textContent = '100%';
    frame.srcdoc = html || '';
    document.getElementById('filePreviewDownload').onclick = () => {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    };
    document.getElementById('filePreviewPrint').onclick = () => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
    };
    const previewModal = bootstrap.Modal.getOrCreateInstance(modal);
    previewModal.show();
    return { modal, objectUrl };
}

function openCropper(input, previewId, ratio) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentPreviewId = previewId;
            const image = document.getElementById('imageToCrop');
            image.src = e.target.result;

            let modal = bootstrap.Modal.getInstance(document.getElementById('modalCropper')); if (!modal) modal = new bootstrap.Modal(document.getElementById('modalCropper'));
            modal.show();

            document.getElementById('modalCropper').addEventListener('shown.bs.modal', function () {
                if (cropper) cropper.destroy();
                cropper = new Cropper(image, {
                    aspectRatio: ratio,
                    viewMode: 1,
                    autoCropArea: 1
                });
            }, { once: true });
        }
        reader.readAsDataURL(input.files[0]);
    }
    input.value = '';
}

function convertImageToBase64(urlOrData, maxDim = 250, mimeType = 'image/png') {
    if (!urlOrData || typeof urlOrData !== 'string') return Promise.resolve('');
    if (urlOrData.includes('logo-simpeel.png') || urlOrData.includes('placeholder.com')) {
        return Promise.resolve('');
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w >= h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, w);
                canvas.height = Math.max(1, h);
                const ctx = canvas.getContext('2d');
                if (mimeType === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                let res = canvas.toDataURL(mimeType, 0.85);
                // Jika masih melebihi 40.000 karakter, fallback kompresi JPEG agar aman untuk Google Sheets
                if (res.length > 40000) {
                    const fbCanvas = document.createElement('canvas');
                    fbCanvas.width = canvas.width;
                    fbCanvas.height = canvas.height;
                    const fbCtx = fbCanvas.getContext('2d');
                    fbCtx.fillStyle = '#ffffff';
                    fbCtx.fillRect(0, 0, fbCanvas.width, fbCanvas.height);
                    fbCtx.drawImage(canvas, 0, 0);
                    res = fbCanvas.toDataURL('image/jpeg', 0.75);
                }
                resolve(res);
            } catch (err) {
                resolve(urlOrData.startsWith('data:') ? urlOrData : '');
            }
        };
        img.onerror = () => {
            resolve(urlOrData.startsWith('data:') ? urlOrData : '');
        };
        img.src = urlOrData;
    });
}

function doCrop() {
    if (!cropper) return;
    const rawCanvas = cropper.getCroppedCanvas();
    if (!rawCanvas) return;

    // Tentukan batasan dimensi & format optimal berdasarkan target preview
    let maxDim = 250;
    let mimeType = 'image/png';
    let quality = 0.85;

    if (currentPreviewId === 'previewBgLanding') {
        maxDim = 800;
        mimeType = 'image/jpeg';
        quality = 0.75;
    } else if (currentPreviewId === 'previewFotoPegawai') {
        maxDim = 300;
        mimeType = 'image/jpeg';
        quality = 0.8;
    } else {
        // Logo Instansi & Logo Sekolah (1:1 ratio)
        maxDim = 200;
        mimeType = 'image/png';
        quality = 0.85;
    }

    let w = rawCanvas.width;
    let h = rawCanvas.height;
    if (w > maxDim || h > maxDim) {
        if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
        } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
        }
    }

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.max(1, w);
    scaledCanvas.height = Math.max(1, h);
    const ctx = scaledCanvas.getContext('2d');

    if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    }
    ctx.drawImage(rawCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

    let base64Image = scaledCanvas.toDataURL(mimeType, quality);
    // Jika ukuran base64 PNG masih > 40.000 karakter, fallback ke JPEG terkompresi
    if (base64Image.length > 40000 && mimeType === 'image/png') {
        const fbCanvas = document.createElement('canvas');
        fbCanvas.width = scaledCanvas.width;
        fbCanvas.height = scaledCanvas.height;
        const fbCtx = fbCanvas.getContext('2d');
        fbCtx.fillStyle = '#ffffff';
        fbCtx.fillRect(0, 0, fbCanvas.width, fbCanvas.height);
        fbCtx.drawImage(scaledCanvas, 0, 0);
        base64Image = fbCanvas.toDataURL('image/jpeg', 0.8);
    }

    if (currentPreviewId && document.getElementById(currentPreviewId)) {
        document.getElementById(currentPreviewId).src = base64Image;
    }

    const modalCropper = document.getElementById('modalCropper');
    if (modalCropper) {
        const inst = bootstrap.Modal.getInstance(modalCropper);
        if (inst) inst.hide();
    }
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

async function exportToExcel(tableId, fileName) {
    const table = $('#' + tableId).DataTable();
    const originalData = table.rows({ search: 'applied' }).data().toArray(); 

    if (originalData.length === 0) {
        Swal.fire('Peringatan', 'Tidak ada data untuk di-export!', 'warning');
        return;
    }

    const headers = [];
    $('#' + tableId + ' thead th').each(function () {
        headers.push($(this).text().trim());
    });

    let hasAksi = false;
    if (headers[headers.length - 1].toLowerCase() === 'aksi') {
        headers.pop();
        hasAksi = true;
    }

    let allPegawaiMap = {};
    if (typeof dbManager !== 'undefined') {
        try {
            const allPegawai = await dbManager.getAllPegawai();
            allPegawai.forEach(p => allPegawaiMap[p.nip] = p);
        } catch (e) { }
    }

    const isDUK = tableId.startsWith('tblDUK');

    if (!isDUK) {
        headers.unshift('No.');
        headers.push('Status Pegawai', 'Tempat Tanggal Lahir', 'Jenis Kelamin', 'Masa Kerja', 'Pendidikan Terakhir');
    }

    const data = [];
    let urut = 1;
    originalData.forEach(row => {
        const rawRow = [...row];

        let nipMatch = '';
        for (let j = rawRow.length - 1; j >= 0; j--) {
            const match = String(rawRow[j]).match(/lihatPegawai\(['"](\d+)['"]\)/);
            if (match) { nipMatch = match[1]; break; }
        }

        if (hasAksi) {
            rawRow.pop();
        }

        const cleanRow = rawRow.map(html => {
            if (typeof html === 'string') {
                html = html.replace(/<br\s*\/?>/gi, ' \n');
            }
            const temp = document.createElement('div');
            temp.innerHTML = html;
            return (temp.textContent || temp.innerText || '').trim();
        });

        if (!isDUK) {
            cleanRow.unshift(urut++);
            const p = allPegawaiMap[nipMatch];
            if (p) {
                cleanRow.push(p.statusPegawai || '-');
                cleanRow.push((p.tempatLahir || '') + (p.tempatLahir && p.tglLahir ? ', ' : '') + (p.tglLahir || '-'));
                cleanRow.push(p.kelamin || '-');

                let mk = '-';
                if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
                    const lp = p.riwayatPangkat[0]; 
                    if (lp && lp.length >= 7) mk = `${lp[5]} Thn ${lp[6]} Bln`;
                }
                if (mk === '-' && p.riwayatKGB && p.riwayatKGB.length > 0) {
                    const lk = p.riwayatKGB[0];
                    if (lk && lk.length >= 6) mk = `${lk[4]} Thn ${lk[5]} Bln`;
                }
                cleanRow.push(mk);
                cleanRow.push(p.pendidikan || '-');
            } else {
                cleanRow.push('-', '-', '-', '-', '-');
            }
        }

        data.push(cleanRow);
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    const totalCols = headers.length;
    const lastColLetter = String.fromCharCode(64 + totalCols);

    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = fileName.toUpperCase().replace(/_/g, ' ');
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const schoolCell = worksheet.getCell('A2');
    schoolCell.value = document.getElementById('textSekolah')?.innerText || "INSTANSI / SEKOLAH";
    schoolCell.font = { name: 'Arial', size: 12, bold: true };
    schoolCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const yearCell = worksheet.getCell('A3');
    yearCell.value = "TAHUN " + new Date().getFullYear();
    yearCell.font = { name: 'Arial', size: 12, bold: true };
    yearCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const headerRow = worksheet.getRow(5);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentRow = 6;
    data.forEach(cleanRow => {
        const r = worksheet.getRow(currentRow);
        cleanRow.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (typeof val === 'string' && val.includes('\n')) {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            }
        });
        currentRow++;
    });

    for (let i = 1; i <= totalCols; i++) {
        const column = worksheet.getColumn(i);
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let valStr = cell.value ? cell.value.toString() : '';
            let lines = valStr.split('\n');
            let maxLineLength = Math.max(...lines.map(l => l.length));
            if (maxLineLength > maxLength) maxLength = maxLineLength;
        });

        if (i === 1) {
            column.width = 6;
        } else {
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        }
    }

    const sigStartRow = currentRow + 2;
    const sigColStart = Math.max(1, totalCols - 1);
    const sigColEnd = totalCols;
    const sigColLetterStart = String.fromCharCode(64 + sigColStart);
    const sigColLetterEnd = String.fromCharCode(64 + sigColEnd);

    if (totalCols > 1) {
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow}:${sigColLetterEnd}${sigStartRow}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 1}:${sigColLetterEnd}${sigStartRow + 1}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 5}:${sigColLetterEnd}${sigStartRow + 5}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 6}:${sigColLetterEnd}${sigStartRow + 6}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 7}:${sigColLetterEnd}${sigStartRow + 7}`);
    }

    worksheet.getCell(`${sigColLetterStart}${sigStartRow}`).value = "Mengetahui,";
    worksheet.getCell(`${sigColLetterStart}${sigStartRow}`).alignment = { horizontal: 'center' };

    worksheet.getCell(`${sigColLetterStart}${sigStartRow + 1}`).value = "Pimpinan / Kepala";
    worksheet.getCell(`${sigColLetterStart}${sigStartRow + 1}`).alignment = { horizontal: 'center' };

    const nameCell = worksheet.getCell(`${sigColLetterStart}${sigStartRow + 5}`);
    nameCell.value = "______________________";
    nameCell.font = { bold: true, underline: true };
    nameCell.alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([buffer], { type: mimeType });
    openFilePreview({ fileName: fileName + '.xlsx', blob, html: workbookPreviewHtml(workbook), mimeType });
}

async function backupDataJSON() {
    Swal.fire({ title: 'Memproses Backup...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const semuaPegawai = await dbManager.getAllPegawai();
        const pengaturan = await dbManager.getPengaturan();
        const semuaAkun = await dbManager.getAllAkun();
        
        const backupData = {
            pegawai: semuaPegawai || [],
            pengaturan: pengaturan || {},
            akun: semuaAkun || [],
            tanggalBackup: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const tgl = new Date().toISOString().split('T')[0];
        const blob = new Blob([dataStr], { type: 'application/json' });
        const previewHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font:13px monospace;white-space:pre-wrap;overflow-wrap:anywhere;padding:20px}</style></head><body>${escapePreviewHtml(dataStr)}</body></html>`;
        openFilePreview({ fileName: `Backup_SiMPeEL_${tgl}.json`, blob, html: previewHtml, mimeType: 'application/json' });
    } catch(e) {
        console.error(e);
        Swal.fire('Gagal', 'Terjadi kesalahan saat membackup data.', 'error');
    }
}

async function restoreDataJSON() {
    if (window.require) {
        const { ipcRenderer } = require('electron');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const text = ev.target.result;
                try {
                    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                    const res = await ipcRenderer.invoke('simpeel-restore', text);
                    if (res && res.success) {
                        Swal.fire('Berhasil', 'Data berhasil direstore. Halaman akan dimuat ulang.', 'success').then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Gagal', res.message || 'Gagal restore data.', 'error');
                    }
                } catch(err) {
                    Swal.fire('Gagal', 'File JSON tidak valid.', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    } else {
        Swal.fire('Informasi', 'Fitur restore hanya tersedia di aplikasi desktop.', 'info');
    }
}

function showPrivacyPolicy(e) {
    e.preventDefault();
    if (window.bootstrap) {
        const modal = new bootstrap.Modal(document.getElementById('modalPrivacy'));
        modal.show();
    }
}

window.currentEditStatusNip = null;
window.currentKgbNip = null;

window.bukaModalSync = async function() {
    try {
        const m = document.getElementById('modalSync');
        if (m) {
            const config = await apiCall('getConfig');
            const url = (config && (config.syncUrl || config.OFFLINE_EXEC_LINK || config.gasUrl || config.linkExec)) || '';
            if (url) {
                const el = document.getElementById('syncExecUrl');
                if (el) el.value = url;
            }
            const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
            modal.show();
        }
    } catch(e) {
        console.error('Error bukaModalSync:', e);
    }
}

// Suppress DataTable warning popups
if (typeof $ !== 'undefined' && $.fn && $.fn.dataTable) {
    $.fn.dataTable.ext.errMode = 'none';
}

window.mulaiSinkronisasi = async function() {
    const execUrl = document.getElementById('syncExecUrl').value.trim();
    if (!execUrl) return Swal.fire('Error', 'Link Exec tidak boleh kosong', 'error');
    
    // Simpan URL dulu
    const saveUrlResult = await apiCall('saveSyncUrl', execUrl);
    if (saveUrlResult && saveUrlResult.success === false) {
        return Swal.fire('Gagal', saveUrlResult.message || 'URL sinkronisasi gagal disimpan.', 'error');
    }

    const electronModule = (() => {
        try { return window.require ? window.require('electron') : (typeof require === 'function' ? require('electron') : null); } catch (e) { return null; }
    })();
    let progressListener = null;

    function attachProgressListener() {
        if (!electronModule?.ipcRenderer || progressListener) return;
        progressListener = (e, msg) => {
            const content = Swal.getHtmlContainer();
            if (content) {
                content.innerHTML = `<div class="mb-2">Mohon tunggu, sedang memproses sinkronisasi...</div><div class="fw-bold text-primary mt-2"><i class="fas fa-spinner fa-spin me-2"></i>${msg}</div>`;
            }
        };
        electronModule.ipcRenderer.on('sync-progress', progressListener);
    }

    function detachProgressListener() {
        if (electronModule?.ipcRenderer && progressListener) {
            electronModule.ipcRenderer.removeListener('sync-progress', progressListener);
            progressListener = null;
        }
    }

    function showSyncProgress() {
        Swal.fire({
            title: 'Menyinkronkan Data...',
            html: '<div>Mohon tunggu, menyiapkan sinkronisasi...</div>',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        attachProgressListener();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function askConflictChoices(conflicts) {
        const rows = conflicts.map((conflict, index) => {
            const isDeletion = conflict.operation === 'delete';
            const changes = (conflict.changes || []).map(change => `
                <div class="border-top pt-1 mt-1 small">
                    <strong>${escapeHtml(change.field)}</strong>
                    <div><span class="text-primary">Desktop:</span> ${escapeHtml(change.localValue)}</div>
                    <div><span class="text-success">Online:</span> ${escapeHtml(change.onlineValue)}</div>
                </div>`).join('');
            const options = isDeletion
                ? `<option value="delete">Konfirmasi hapus data yang masih ada di kedua sisi</option>
                    ${conflict.localExists ? '<option value="restore-local">Batalkan hapus; pertahankan Desktop</option>' : ''}
                    ${conflict.onlineExists ? '<option value="restore-online">Batalkan hapus; pertahankan Online / Spreadsheet</option>' : ''}`
                : `<option value="local">Pertahankan data Desktop</option>
                    <option value="online">Pertahankan data Online / Spreadsheet</option>`;
            const placeholder = isDeletion ? 'Pilih: konfirmasi penghapusan atau pulihkan data...' : 'Pilih data yang dipertahankan...';
            return `
                <div class="border rounded p-2 mb-2 text-start">
                    <div class="fw-bold">${isDeletion ? 'Konflik Penghapusan' : escapeHtml(conflict.type === 'pegawai' ? 'Data Pegawai' : 'Akun')} — ${escapeHtml(conflict.nama || conflict.nip)}</div>
                    <div class="small text-muted mb-2">NIP: ${escapeHtml(conflict.nip)}</div>
                    ${changes}
                    <select class="form-select form-select-sm sync-conflict-choice mt-2" data-conflict-index="${index}">
                        <option value="">${placeholder}</option>
                        ${options}
                    </select>
                </div>`;
        }).join('');

        return Swal.fire({
            title: 'Konflik Data',
            html: `<p class="text-start small">Data dengan NIP yang sama berbeda atau dihapus di salah satu sisi. Belum ada perubahan yang diterapkan. Jika mengonfirmasi penghapusan, semua salinan yang masih ada akan dihapus dari Desktop dan Online.</p><div style="max-height:55vh;overflow-y:auto">${rows}</div>`,
            width: 650,
            showCancelButton: true,
            confirmButtonText: 'Lanjutkan Sinkronisasi',
            cancelButtonText: 'Batalkan',
            allowOutsideClick: false,
            preConfirm: () => {
                const choices = {};
                const selects = document.querySelectorAll('.sync-conflict-choice');
                for (const select of selects) {
                    if (!select.value) {
                        Swal.showValidationMessage('Pilih sumber data untuk semua konflik.');
                        return false;
                    }
                    const conflict = conflicts[Number(select.dataset.conflictIndex)];
                    choices[conflict.key] = select.value;
                }
                return choices;
            }
        });
    }

    try {
        showSyncProgress();
        let result = await apiCall('sinkronisasi', { syncUrl: execUrl });

        while (result?.requiresResolution) {
            detachProgressListener();
            const choiceResult = await askConflictChoices(result.conflicts || []);
            if (!choiceResult.isConfirmed) return;
            showSyncProgress();
            result = await apiCall('sinkronisasi', {
                syncUrl: execUrl,
                resolutions: choiceResult.value
            });
        }
        
        if (result && result.success) {
            detachProgressListener();
            const { pushed, pulled } = result;
            const deleted = result.deleted || { pegawai: 0, akun: 0 };
            Swal.fire({
                title: '✅ Sinkronisasi Berhasil!',
                html: `
                    <div class="text-start">
                        <p class="mb-2"><strong>Data dikirim ke Cloud:</strong></p>
                        <ul class="mb-3">
                            <li>Pegawai: <strong class="text-success">${pushed.pegawai}</strong> record</li>
                            <li>Akun: <strong class="text-success">${pushed.akun}</strong> record</li>
                        </ul>
                        <p class="mb-2"><strong>Data diambil dari Cloud:</strong></p>
                        <ul>
                            <li>Pegawai: <strong class="text-primary">${pulled.pegawai}</strong> record</li>
                            <li>Akun: <strong class="text-primary">${pulled.akun}</strong> record</li>
                        </ul>
                        <p class="mb-2"><strong>Salinan dihapus setelah konfirmasi:</strong></p>
                        <ul class="mb-0">
                            <li>Pegawai: <strong class="text-danger">${deleted.pegawai}</strong> salinan</li>
                            <li>Akun: <strong class="text-danger">${deleted.akun}</strong> salinan</li>
                        </ul>
                    </div>`,
                icon: 'success'
            });
            // Refresh data lokal
            await dbManager.forceFetchFromServer();
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalSync'));
            if (modal) modal.hide();
        } else {
            detachProgressListener();
            Swal.fire('Gagal!', result ? result.message : 'Sinkronisasi gagal.', 'error');
        }
    } catch(e) {
        detachProgressListener();
        Swal.fire('Error', e.message, 'error');
    }
}

// Badge Online/Offline
function updateConnectionStatus() {
    const badge = document.getElementById('connectionStatus');
    if (badge) {
        if (navigator.onLine) {
            badge.className = 'badge bg-success me-2';
            badge.innerHTML = '<i class="fas fa-wifi"></i> Online';
        } else {
            badge.className = 'badge bg-danger me-2';
            badge.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        }
    }
}
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
document.addEventListener('DOMContentLoaded', updateConnectionStatus);
