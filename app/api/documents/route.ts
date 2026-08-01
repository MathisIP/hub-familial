import { NextResponse, type NextRequest } from 'next/server';
import {
  chargerDocuments,
  ajouterDocument,
  modifierDocument,
  supprimerDocument,
} from '@/lib/documents/service';
import { reponseErreur } from '@/lib/api';

/**
 * API du module Documents (fichiers du foyer, stockage propre).
 *   GET    — liste des documents + dossiers existants
 *   POST   — téléversement (multipart : `fichiers` + `dossier`)
 *   PATCH  — renommer / ranger un document
 *   DELETE — supprimer un document (base + fichier stocké)
 * Tout est scopé au foyer courant côté service.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // téléversements potentiellement lents

export async function GET() {
  try {
    return NextResponse.json(await chargerDocuments());
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ erreur: 'Envoi invalide.' }, { status: 400 });
    }

    const dossier = String(form.get('dossier') ?? '');
    const entrees = form.getAll('fichiers').filter((e): e is File => e instanceof File);
    if (entrees.length === 0) {
      return NextResponse.json({ erreur: 'Aucun fichier.' }, { status: 400 });
    }

    // Séquentiel : évite de saturer la mémoire de la fonction sur un gros lot.
    const ajoutes = [];
    for (const f of entrees) {
      const donnees = Buffer.from(await f.arrayBuffer());
      ajoutes.push(await ajouterDocument(f.name || 'document', f.type, donnees, dossier));
    }
    return NextResponse.json({ ok: true, documents: ajoutes });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, nom, dossier } = await req.json();
    if (!id) return NextResponse.json({ erreur: 'Document manquant.' }, { status: 400 });
    await modifierDocument(String(id), { nom, dossier });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ erreur: 'Document manquant.' }, { status: 400 });
    await supprimerDocument(String(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
