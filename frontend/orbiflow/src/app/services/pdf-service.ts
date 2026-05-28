import { Injectable } from '@angular/core';
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFontsLib from 'pdfmake/build/vfs_fonts';

const pdfMake = (pdfMakeLib as any).default || pdfMakeLib;
const pdfFonts = (pdfFontsLib as any).default || pdfFontsLib;
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

 constructor() { }

  descargar(documentDefinition: any, nombreArchivo: string) {
    pdfMake.createPdf(documentDefinition).download(nombreArchivo);
  }

  abrirEnPestania(documentDefinition: any) {
    pdfMake.createPdf(documentDefinition).open();
  }
  
  imprimir(documentDefinition: any) {
    pdfMake.createPdf(documentDefinition).print();
  }
}