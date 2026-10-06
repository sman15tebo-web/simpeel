function downloadSkumptkDocument(data, formValues, tglCetak, namaLengkap, fmtTgl, fmtTglSingkat) {
let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>SKUMPTK</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; margin: 0; }
  table { border-collapse: collapse; }
  td, th { padding: 3px 5px; }
  .border-table, .border-table td, .border-table th { border: 1px solid black; }
  @page Section1 { size: 21.59cm 33.02cm; margin: 1.5cm 1.5cm 1cm 2cm; }
  div.Section1 { page: Section1; }
  @page Section2 { size: 33.02cm 21.59cm; margin: 1.5cm 1cm 1.5cm 1cm; mso-page-orientation: landscape; }
  div.Section2 { page: Section2; }
</style>
</head><body>
<div class="Section1">

<div style="text-align:center; font-size:13pt; font-weight:bold; text-decoration:underline; margin-bottom:24px; letter-spacing:1px;">
  SURAT KETERANGAN UNTUK MENDAPATKAN<br>PEMBAYARAN TUNJANGAN KELUARGA <b>(SKUMPTK)</b>
</div>

<table style="width:100%; font-size:11pt; margin-bottom: 16px;">
  <tr>
    <td style="width:220px; font-weight:bold; padding:2px 5px; vertical-align:top;">NAMA INSTANSI&nbsp;/&nbsp;UNIT KERJA</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiNama}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">ALAMAT LENGKAP INSTANSI</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiAlamat}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">INSTANSI INDUK</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiInduk}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">BENDAHARA&nbsp;PENGELUARAN</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.bendahara}</td>
  </tr>
</table>



<div style="font-size:11pt; margin-bottom:14px;">
  <b>DATA PEGAWAI&nbsp;:</b>
</div>

<table style="width:100%; font-size:11pt; margin-bottom:14px;">
  <tr><td style="width:220px; padding:2px 5px;">Nama Lengkap</td><td style="padding:2px 5px;">:&nbsp;<b>${namaLengkap || data.nama || '-'}</b></td></tr>
  <tr><td style="padding:2px 5px;">NIP</td><td style="padding:2px 5px;">:&nbsp;${data.nip || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">Pangkat / Golongan Ruang</td><td style="padding:2px 5px;">:&nbsp;${data.golongan || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">TMT Golongan</td><td style="padding:2px 5px;">:&nbsp;${formValues.tmtGol}</td></tr>
  <tr><td style="padding:2px 5px;">Tempat/Tanggal Lahir</td><td style="padding:2px 5px;">:&nbsp;${data.tempatLahir || '-'},&nbsp;${fmtTgl(data.tglLahir)}</td></tr>
  <tr><td style="padding:2px 5px;">Jenis Kelamin</td><td style="padding:2px 5px;">:&nbsp;${data.kelamin || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">Agama&nbsp;/&nbsp;Kebangsaan</td><td style="padding:2px 5px;">:&nbsp;${data.agama || '-'}&nbsp;&nbsp;/&nbsp;&nbsp;Indonesia</td></tr>
  <tr><td style="padding:2px 5px;">Alamat Lengkap</td><td style="padding:2px 5px;">:&nbsp;${data.alamat || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">TMT Calon Pegawai</td><td style="padding:2px 5px;">:&nbsp;${formValues.tmtCpns}</td></tr>
  <tr><td style="padding:2px 5px;">Jenis Kepegawaian</td><td style="padding:2px 5px;">:&nbsp;${formValues.jenisKepeg}</td></tr>
  <tr><td style="padding:2px 5px;">Status Kepegawaian</td><td style="padding:2px 5px;">:&nbsp;${formValues.statusKepeg}</td></tr>
  <tr><td style="padding:2px 5px;">Digaji menurut PP/SK</td><td style="padding:2px 5px;">:&nbsp;${formValues.ppSk}&nbsp;,&nbsp;Gaji Pokok&nbsp;:&nbsp;Rp.&nbsp;${formValues.gajiPokok},-</td></tr>
  <tr><td style="padding:2px 5px;">Besarnya Penghasilan sebulan</td><td style="padding:2px 5px;">:&nbsp;Rp.&nbsp;${formValues.gajiBersih},-&nbsp;/&nbsp;bulan</td></tr>
  <tr><td style="padding:2px 5px;">Jabatan Struktural</td><td style="padding:2px 5px;">:&nbsp;Eselon&nbsp;${formValues.eselon}</td></tr>
  <tr><td style="padding:2px 5px;">Jumlah Keluarga tertanggung</td><td style="padding:2px 5px;">:&nbsp;${formValues.jmlKeluarga}&nbsp;orang</td></tr>
  <tr><td style="padding:2px 5px;">SK Terakhir yang dimiliki</td><td style="padding:2px 5px;">:&nbsp;${formValues.skTerakhir}</td></tr>
  <tr><td style="padding:2px 5px;">Masa Kerja Golongan</td><td style="padding:2px 5px;">:&nbsp;${formValues.mkGol}</td></tr>
  <tr><td style="padding:2px 5px;">Masa Kerja Keseluruhan</td><td style="padding:2px 5px;">:&nbsp;${formValues.mkTotal}</td></tr>
</table>

<p style="text-align:justify; font-size:11pt; line-height:1.5; margin-bottom:30px;">
  Keterangan ini saya buat dengan sesungguhnya dan apabila keterangan ini tidak benar (palsu), saya bersedia dituntut dimuka pengadilan berdasarkan Undang &ndash; undang yang berlaku, dan bersedia mengembalikan semua uang tunjangan yang telah saya terima yang seharusnya bukan menjadi hak saya.
</p>

<table style="width:100%; font-size:11pt;">
  <tr>
    <td style="width:50%; text-align:center; vertical-align:top;">
      &nbsp;<br>
      Mengetahui&nbsp;/&nbsp;Mengesahkan<br>
      Atasan Langsung<br><br><br><br><br>
      <b><u>${formValues.atasanNama}</u></b><br>
      NIP.&nbsp;${formValues.atasanNip}
    </td>
    <td style="width:50%; text-align:center; vertical-align:top;">
      ${formValues.tempat},&nbsp;${tglCetak}<br>
      &nbsp;<br>
      Pegawai yang bersangkutan<br><br><br><br><br>
      <b><u>${namaLengkap || data.nama || '...'}</u></b><br>
      NIP.&nbsp;${data.nip || '...'}
    </td>
  </tr>
</table>

</div>

<!-- PAGE BREAK KE LANDSCAPE -->
<br clear="all" style="page-break-before:always; mso-break-type:section-break">

<div class="Section2">

<div style="font-size:11pt; font-weight:bold; text-align:center; text-decoration:underline; margin-bottom:10px;">
  DATA KELUARGA YANG MENJADI TANGGUNGAN PEGAWAI
</div>
<div style="font-size:10pt; font-weight:bold; margin-bottom:6px;">KAWIN SYAH DENGAN</div>`;

html += `
<table class="border-table" style="width:100%; font-size:9pt; margin-bottom:16px;">
  <thead>
    <tr style="background:#f0f0f0; text-align:center; font-weight:bold;">
      <th style="width:25px;">NO</th>
      <th>NAMA ISTRI/SUAMI</th>
      <th>TEMPAT LAHIR</th>
      <th>TANGGAL LAHIR</th>
      <th>N.I.P&nbsp;/&nbsp;N.I.K</th>
      <th>PEKERJAAN</th>
      <th>TANGGAL PERKAWINAN</th>
      <th>ISTRI&nbsp;/&nbsp;SUAMI KE-</th>
      <th>PENGHASILAN&nbsp;/&nbsp;BULAN</th>
    </tr>
  </thead>
  <tbody>`;

    if (data.pasanganNama) {
        html += `
    <tr style="text-align:center;">
      <td>1</td>
      <td style="text-align:left;">${data.pasanganNama || '-'}</td>
      <td>${data.pasanganTmptLahir || '-'}</td>
      <td>${fmtTglSingkat(data.pasanganTglLahir)}</td>
      <td>${data.pasanganNik || data.pasanganNip || '-'}</td>
      <td>${data.pasanganPekerjaan || '-'}</td>
      <td>${data.pasanganTglNikah ? fmtTglSingkat(data.pasanganTglNikah) : '-'}</td>
      <td>1</td>
      <td>${data.pasanganPenghasilan || '-'}</td>
    </tr>`;
    } else {
        html += `<tr><td colspan="9" style="text-align:center; font-style:italic;">- Tidak ada data pasangan -</td></tr>`;
    }

    html += `</tbody></table>`;

html += `
<div style="font-size:10pt; font-weight:bold; margin-bottom:4px; margin-top:30px;">ANAK-ANAK YANG MENJADI TANGGUNGAN</div>
<div style="font-size:9pt; margin-bottom:4px;">
  Menjadi Anak-anak seperti dalam daftar dibawah ini.<br>
  Anak Kandung (AK) Anak Tiri (AT) Anak Angkat (AA) yang masih menjadi tanggungan belum mempunyai pekerjaan sendiri dan masuk dalam Daftar Gaji.<br>
  Anak Kandung (AK) Anak Tiri (AT) Anak Angkat (AA) yang masih menjadi tanggungan tapi tidak&nbsp;masuk dalam Daftar Gaji.
</div>
<table class="border-table" style="width:100%; font-size:9pt;">
  <thead>
    <tr style="background:#f0f0f0; text-align:center; font-weight:bold;">
      <th style="width:25px;">NO</th>
      <th>NAMA ANAK</th>
      <th>TEMPAT LAHIR</th>
      <th>TANGGAL LAHIR</th>
      <th>STATUS ANAK</th>
      <th>DARI ISTRI/SUAMI KE-</th>
      <th>JENIS KELAMIN</th>
      <th>DAPAT/TIDAK TUNJANGAN</th>
      <th>SUDAH/BELUM KAWIN</th>
      <th>MASIH/TIDAK SEKOLAH/KULIAH</th>
      <th>PUTUSAN PENGADILAN (KHUSUS AL)</th>
    </tr>
  </thead>
  <tbody>`;

    const riwayatAnak = Array.isArray(data.riwayatAnak) ? data.riwayatAnak.filter(a => a && a[0]) : [];
    if (riwayatAnak.length > 0) {
        riwayatAnak.forEach((a, idx) => {
            // riwayatAnak kolom: [0]Nama, [1]kotaLahir, [2]tglLahir, [3]statusAnak, [4]kelamin, [5]dapatTunjangan, [6]statusKawin, [7]statusSekolah, [8]dariIstri
            html += `
    <tr style="text-align:center;">
      <td>${idx + 1}</td>
      <td style="text-align:left;">${a[0] || '-'}</td>
      <td>${a[1] || '-'}</td>
      <td>${fmtTglSingkat(a[2]) || '-'}</td>
      <td>${a[3] || 'AK'}</td>
      <td>${a[8] || '1'}</td>
      <td>${a[4] || '-'}</td>
      <td>${a[5] || '-'}</td>
      <td>${a[6] || 'BELUM'}</td>
      <td>${a[7] || 'MASIH'}</td>
      <td>-</td>
    </tr>`;
        });
    } else {
        html += `<tr><td colspan="11" style="text-align:center; font-style:italic;">- Tidak ada data anak -</td></tr>`;
    }

    html += `</tbody></table>
</div>
</body></html>`;

    // Preview before downloading or printing the Word document.
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const fileName = 'SKUMPTK_' + (data.nama || data.nip).replace(/[^a-zA-Z0-9]/g, '_') + '.doc';
    openFilePreview({ fileName, blob, html: documentPreviewHtml(html), mimeType: 'application/msword' });
};
