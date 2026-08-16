'use client';

import { useState } from 'react';
import Liste from '@/components/Liste';
import Astuce from '@/components/Astuce';
import { useT } from '@/components/I18nProvider';
import { RSVP_VALEURS, type Evenement } from '@/lib/evenements/schema';

/**
 * Gestion des trois sous-listes d'un événement : invités, checklist, menu.
 *
 * Repliées par défaut. Un foyer consulte sa liste d'événements bien plus souvent
 * qu'il ne modifie les invités de l'un d'eux : tout déplier d'office noierait
 * l'essentiel — la date, le statut, le budget — sous des dizaines de lignes.
 * Les compteurs restent visibles sur la carte, dépliés ou non.
 */
type Liste = 'invites' | 'checklist' | 'menu';

function appel(methode: string, corps: unknown): Promise<Response> {
  return fetch('/api/evenements/listes', {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

export default function SousListes({
  ev,
  occupe,
  action,
}: {
  ev: Evenement;
  occupe: boolean;
  action: (fn: () => Promise<Response>) => Promise<void>;
}) {
  const tr = useT();
  const [ouvert, setOuvert] = useState<Liste | null>(null);
  const { invites, checklist, menu } = ev.sousListes;

  const modifier = (liste: Liste, id: string, champs: Record<string, unknown>) =>
    action(() => appel('PATCH', { evenementId: ev.id, liste, id, ...champs }));
  const retirer = (liste: Liste, id: string) =>
    action(() => appel('DELETE', { evenementId: ev.id, liste, id }));
  const ajouter = (liste: Liste, champs: Record<string, unknown>) =>
    action(() => appel('POST', { evenementId: ev.id, liste, ...champs }));

  const onglet = (id: Liste, libelle: string, n: number) => (
    <button
      type="button"
      className={`sl-onglet${ouvert === id ? ' actif' : ''}`}
      onClick={() => setOuvert(ouvert === id ? null : id)}
      aria-expanded={ouvert === id}
    >
      {libelle} {n > 0 && <span className="sl-compteur">{n}</span>}
    </button>
  );

  return (
    <div className="sl">
      <div className="sl-onglets">
        {onglet('invites', `👥 ${tr('EVT_INVITES')}`, invites.length)}
        {onglet('checklist', `✅ ${tr('EVT_CHECKLIST')}`, checklist.length)}
        {onglet('menu', `🍽️ ${tr('EVT_MENU')}`, menu.length)}
      </div>

      {ouvert === 'invites' && (
        <div className="sl-corps">
          {invites.length === 0 && <p className="sl-vide">{tr('EVT_AUCUN_INVITE')}</p>}
          {invites.map((i) => (
            <div className="sl-ligne sl-invite" key={i.id}>
              <span className="sl-nom">{i.nom}</span>
              <Liste
                className="sl-rsvp"
                valeur={i.rsvp}
                disabled={occupe}
                onChange={(v) => modifier('invites', i.id, { rsvp: v })}
                options={RSVP_VALEURS.map((v) => ({ valeur: v, libelle: v }))}
                ariaLabel={`${tr('EVT_RSVP')} — ${i.nom}`}
              />
              <input
                className="champ sl-nb"
                type="number"
                min={1}
                value={i.nbPersonnes}
                disabled={occupe}
                onChange={(e) => modifier('invites', i.id, { nbPersonnes: Number(e.target.value) })}
                aria-label={`${tr('EVT_NB_PERS')} — ${i.nom}`}
              />
              <button className="sl-retirer" onClick={() => retirer('invites', i.id)} disabled={occupe} aria-label={`${tr('G_SUPPRIMER')} ${i.nom}`}>✕</button>
            </div>
          ))}
          <FormeAjout
            champs={[
              { cle: 'nom', libelle: tr('EVT_NOM_INVITE'), requis: true },
              { cle: 'nbPersonnes', libelle: tr('EVT_NB_PERS'), type: 'number', aide: tr('AIDE_NB_PERSONNES') },
            ]}
            occupe={occupe}
            onAjout={(v) => ajouter('invites', v)}
            libelleBouton={tr('EVT_AJOUT_INVITE')}
          />
        </div>
      )}

      {ouvert === 'checklist' && (
        <div className="sl-corps">
          {checklist.length === 0 && <p className="sl-vide">{tr('EVT_AUCUNE_TACHE')}</p>}
          {checklist.map((t) => (
            <div className="sl-ligne" key={t.id}>
              <label className="sl-case">
                <input
                  type="checkbox"
                  checked={t.fait}
                  disabled={occupe}
                  onChange={(e) => modifier('checklist', t.id, { fait: e.target.checked })}
                />
                <span className={t.fait ? 'sl-fait' : ''}>{t.tache}</span>
              </label>
              {t.responsable && <span className="sl-meta">{t.responsable}</span>}
              {t.echeance && <span className="sl-meta">{t.echeance}</span>}
              <button className="sl-retirer" onClick={() => retirer('checklist', t.id)} disabled={occupe} aria-label={`${tr('G_SUPPRIMER')} ${t.tache}`}>✕</button>
            </div>
          ))}
          <FormeAjout
            champs={[
              { cle: 'tache', libelle: tr('EVT_TACHE'), requis: true },
              { cle: 'responsable', libelle: tr('EVT_RESPONSABLE') },
            ]}
            occupe={occupe}
            onAjout={(v) => ajouter('checklist', v)}
            libelleBouton={tr('EVT_AJOUT_TACHE')}
          />
        </div>
      )}

      {ouvert === 'menu' && (
        <div className="sl-corps">
          {menu.length === 0 && <p className="sl-vide">{tr('EVT_AUCUN_PLAT')}</p>}
          {menu.map((p) => (
            <div className="sl-ligne" key={p.id}>
              <label className="sl-case">
                <input
                  type="checkbox"
                  checked={p.achete}
                  disabled={occupe}
                  onChange={(e) => modifier('menu', p.id, { achete: e.target.checked })}
                />
                <span className={p.achete ? 'sl-fait' : ''}>{p.libelle}</span>
              </label>
              {p.quantite && <span className="sl-meta">{p.quantite}</span>}
              {p.cout && <span className="sl-meta sl-cout">{p.cout}</span>}
              <button className="sl-retirer" onClick={() => retirer('menu', p.id)} disabled={occupe} aria-label={`${tr('G_SUPPRIMER')} ${p.libelle}`}>✕</button>
            </div>
          ))}
          <FormeAjout
            champs={[
              { cle: 'libelle', libelle: tr('EVT_PLAT'), requis: true },
              { cle: 'quantite', libelle: tr('EVT_QUANTITE') },
              { cle: 'cout', libelle: tr('EVT_COUT') },
            ]}
            occupe={occupe}
            onAjout={(v) => ajouter('menu', v)}
            libelleBouton={tr('EVT_AJOUT_PLAT')}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Petit formulaire d'ajout, commun aux trois listes : les champs diffèrent, le
 * comportement non (saisir, valider, vider). Un composant plutôt que trois copies.
 */
function FormeAjout({
  champs,
  occupe,
  onAjout,
  libelleBouton,
}: {
  champs: { cle: string; libelle: string; type?: string; requis?: boolean; aide?: string }[];
  occupe: boolean;
  onAjout: (valeurs: Record<string, string | number>) => Promise<void>;
  libelleBouton: string;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const requis = champs.filter((c) => c.requis).map((c) => c.cle);
  const pret = requis.every((c) => (v[c] ?? '').trim() !== '');

  async function valider() {
    if (!pret || occupe) return;
    const sortie: Record<string, string | number> = {};
    for (const c of champs) {
      const brut = (v[c.cle] ?? '').trim();
      if (brut === '') continue;
      sortie[c.cle] = c.type === 'number' ? Number(brut) : brut;
    }
    await onAjout(sortie);
    setV({}); // vider pour enchaîner les saisies sans re-cliquer
  }

  return (
    <div className="sl-ajout">
      {champs.map((c) => (
        <label className="sl-champ" key={c.cle}>
          <span className="sl-lbl">
            {c.libelle}
            {c.aide && <Astuce texte={c.aide} />}
          </span>
          <input
            className="champ"
            type={c.type ?? 'text'}
            min={c.type === 'number' ? 1 : undefined}
            value={v[c.cle] ?? ''}
            disabled={occupe}
            onChange={(e) => setV((x) => ({ ...x, [c.cle]: e.target.value }))}
            // Entrée valide : sur mobile comme au clavier, c'est le geste attendu
            // quand on enchaîne une liste d'invités.
            onKeyDown={(e) => e.key === 'Enter' && valider()}
          />
        </label>
      ))}
      <button className="bouton" onClick={valider} disabled={occupe || !pret}>
        ＋ {libelleBouton}
      </button>
    </div>
  );
}
