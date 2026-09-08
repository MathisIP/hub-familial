'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  STATUTS_EDITORIAL,
  FORMATS_POST,
  familleFormat,
  type Post,
  type StatutEditorial,
} from '@/lib/editorial/schema';

/**
 * CALENDRIER ÉDITORIAL (client) — components/editorial/VueEditorial.tsx.
 * =========================================================================
 * Reprend la maquette HTML fournie (filtres par semaine/format/statut, cartes
 * dépliables, copie de légende/hashtags, cycle de statut au clic) mais l'état
 * n'est plus en `localStorage` : chaque mutation part vers /api/editorial et
 * revient dans `initial` au prochain chargement — foyer et femme voient le
 * même état, comme n'importe quel autre module.
 */
export default function VueEditorial({ initial }: { initial: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [filtreSemaine, setFiltreSemaine] = useState('Tout');
  const [filtreFormat, setFiltreFormat] = useState('Tout');
  const [filtreStatut, setFiltreStatut] = useState('Tout');

  const semaines = useMemo(() => ['Tout', ...new Set(posts.map((p) => p.semaine))], [posts]);

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/editorial', { cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json()).erreur ?? 'Erreur de chargement.');
    setPosts(await r.json());
  }, []);

  const action = useCallback(
    async (fn: () => Promise<Response>) => {
      setOccupe(true);
      setErreur(null);
      try {
        const r = await fn();
        if (!r.ok) throw new Error((await r.json()).erreur ?? 'Action refusée.');
        await rafraichir();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      } finally {
        setOccupe(false);
      }
    },
    [rafraichir],
  );

  function basculerOuvert(numero: number) {
    setOuverts((s) => {
      const suite = new Set(s);
      if (suite.has(numero)) suite.delete(numero);
      else suite.add(numero);
      return suite;
    });
  }

  function cyclerStatut(p: Post) {
    const i = STATUTS_EDITORIAL.indexOf(p.statut);
    const suivant = STATUTS_EDITORIAL[(i + 1) % STATUTS_EDITORIAL.length];
    action(() =>
      fetch('/api/editorial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: p.numero, statut: suivant }),
      }),
    );
  }

  function enregistrerResultats(numero: number, champs: Record<string, number | null>) {
    action(() =>
      fetch('/api/editorial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, ...champs }),
      }),
    );
  }

  function televerserVisuel(numero: number, fichier: File) {
    const form = new FormData();
    form.append('fichier', fichier);
    action(() => fetch(`/api/editorial/visuel/${numero}`, { method: 'POST', body: form }));
  }

  function enregistrerTextes(numero: number, textes: Record<string, string>) {
    action(() =>
      fetch('/api/editorial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, textes }),
      }),
    );
  }

  /*
   * ⚠ LE FILTRE FORMAT PORTE SUR LA FAMILLE (reel/carrousel), PAS SUR LE CODE
   * EXACT. Depuis le plan S2-S4, quatre médiums coexistent (texte, dessins,
   * filmé) : filtrer sur « rf » seul cacherait les reels typographiques, alors
   * que ce qu'on cherche en filtrant, c'est « les vidéos » ou « les carrousels ».
   */
  const affiches = posts.filter(
    (p) =>
      (filtreSemaine === 'Tout' || p.semaine === filtreSemaine) &&
      (filtreFormat === 'Tout' || familleFormat(p.format) === filtreFormat) &&
      (filtreStatut === 'Tout' || p.statut === filtreStatut),
  );

  const compte = (statut: StatutEditorial) => posts.filter((p) => p.statut === statut).length;
  const compteFamille = (f: 'reel' | 'carrousel') => posts.filter((p) => familleFormat(p.format) === f).length;

  let derniereSemaine: string | null = null;

  return (
    <div className="edi">
      <div className="edi-stats">
        <div className="edi-stat"><b>{posts.length}</b><span>Total</span></div>
        <div className="edi-stat"><b>{compteFamille('reel')}</b><span>Reels</span></div>
        <div className="edi-stat"><b>{compteFamille('carrousel')}</b><span>Carrousels</span></div>
        <div className="edi-stat"><b>{compte('À faire')}</b><span>À faire</span></div>
        <div className="edi-stat"><b>{compte('Prêt')}</b><span>Prêt</span></div>
        <div className="edi-stat"><b>{compte('Publié')}</b><span>Publié</span></div>
      </div>

      <div className="edi-filtres">
        <FiltreChips label="Semaine" valeurs={semaines} actif={filtreSemaine} onChoisir={setFiltreSemaine} />
        <FiltreChips
          label="Format"
          valeurs={['Tout', 'reel', 'carrousel']}
          libelles={{ reel: 'Reels', carrousel: 'Carrousels' }}
          actif={filtreFormat}
          onChoisir={setFiltreFormat}
        />
        <FiltreChips label="Statut" valeurs={['Tout', ...STATUTS_EDITORIAL]} actif={filtreStatut} onChoisir={setFiltreStatut} />
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}

      {affiches.length === 0 ? (
        <p className="vide">Aucune publication ne correspond à ces filtres.</p>
      ) : (
        affiches.map((p) => {
          const nouvelleSemaine = p.semaine !== derniereSemaine;
          derniereSemaine = p.semaine;
          return (
            <div key={p.numero}>
              {nouvelleSemaine && <div className="edi-semaine">{p.semaine}</div>}
              <CartePost
                post={p}
                ouvert={ouverts.has(p.numero)}
                occupe={occupe}
                onBasculer={() => basculerOuvert(p.numero)}
                onCyclerStatut={() => cyclerStatut(p)}
                onEnregistrerResultats={(champs) => enregistrerResultats(p.numero, champs)}
                onTeleverserVisuel={(f) => televerserVisuel(p.numero, f)}
                onEnregistrerTextes={(textes) => enregistrerTextes(p.numero, textes)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

function FiltreChips({
  label,
  valeurs,
  libelles,
  actif,
  onChoisir,
}: {
  label: string;
  valeurs: string[];
  /** Libellé affiché pour une valeur, quand la valeur technique n'est pas lisible. */
  libelles?: Record<string, string>;
  actif: string;
  onChoisir: (v: string) => void;
}) {
  return (
    <div className="edi-fgroupe">
      <span className="edi-flabel">{label}</span>
      {valeurs.map((v) => {
        const texte = libelles?.[v] ?? (v.length > 14 ? v.split('—')[0].trim() : v);
        return (
          <button
            key={v}
            className={`edi-chip${actif === v ? ' on' : ''}`}
            onClick={() => onChoisir(v)}
            title={libelles?.[v] ?? v}
          >
            {texte}
          </button>
        );
      })}
    </div>
  );
}

function copier(texte: string, onCopie: () => void) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(texte).then(onCopie).catch(() => repli(texte, onCopie));
  } else {
    repli(texte, onCopie);
  }
}
function repli(texte: string, onCopie: () => void) {
  const ta = document.createElement('textarea');
  ta.value = texte;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    onCopie();
  } catch {
    alert('Copie impossible, sélectionne le texte à la main.');
  }
  document.body.removeChild(ta);
}

function BoutonCopier({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      className={`edi-btn${copie ? ' copied' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        copier(texte, () => {
          setCopie(true);
          setTimeout(() => setCopie(false), 1400);
        });
      }}
    >
      {copie ? 'Copié' : 'Copier'}
    </button>
  );
}

/**
 * Bloc de texte éditable (hook, déroulé, légende, hashtags, note) : affiché en
 * lecture, un bouton « Modifier » révèle un textarea + Enregistrer/Annuler.
 * Simple écrasement à l'enregistrement, sans historique (décision utilisateur
 * 07/09/2026) : le texte d'origine reste dans lib/editorial/posts.ts (git),
 * mais l'app elle-même ne montre que la version la plus récente.
 */
function BlocEditable({
  titre,
  valeur,
  occupe,
  mono = true,
  action,
  onEnregistrer,
}: {
  titre: string;
  valeur: string;
  occupe: boolean;
  mono?: boolean;
  action?: React.ReactNode;
  onEnregistrer: (v: string) => void;
}) {
  const [edite, setEdite] = useState(false);
  const [brouillon, setBrouillon] = useState(valeur);

  return (
    <div className="edi-sec">
      <div className="edi-sech">
        {titre}
        {!edite && action}
        {!edite && (
          <button
            type="button"
            className="edi-btn"
            onClick={(e) => {
              e.stopPropagation();
              setBrouillon(valeur);
              setEdite(true);
            }}
          >
            Modifier
          </button>
        )}
      </div>
      {edite ? (
        <div className="edi-edition" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="champ edi-textarea"
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            rows={mono ? 6 : 2}
            autoFocus
          />
          <div className="edi-edition-actions">
            <button
              type="button"
              className="bouton"
              disabled={occupe}
              onClick={() => {
                onEnregistrer(brouillon);
                setEdite(false);
              }}
            >
              Enregistrer
            </button>
            <button type="button" className="bouton discret" disabled={occupe} onClick={() => setEdite(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className={`edi-box ${mono ? 'mono' : ''}`}>{valeur}</div>
      )}
    </div>
  );
}

function CartePost({
  post,
  ouvert,
  occupe,
  onBasculer,
  onCyclerStatut,
  onEnregistrerResultats,
  onTeleverserVisuel,
  onEnregistrerTextes,
}: {
  post: Post;
  ouvert: boolean;
  occupe: boolean;
  onBasculer: () => void;
  onCyclerStatut: () => void;
  onEnregistrerResultats: (champs: Record<string, number | null>) => void;
  onTeleverserVisuel: (fichier: File) => void;
  onEnregistrerTextes: (textes: Record<string, string>) => void;
}) {
  const [vues, setVues] = useState(post.vues?.toString() ?? '');
  const [interactions, setInteractions] = useState(post.interactions?.toString() ?? '');
  const [enregistrements, setEnregistrements] = useState(post.enregistrements?.toString() ?? '');
  const [partages, setPartages] = useState(post.partages?.toString() ?? '');
  const fichierRef = useRef<HTMLInputElement>(null);

  function versNombre(v: string): number | null {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div className={`edi-carte${post.statut === 'Publié' ? ' fait' : ''}${ouvert ? ' open' : ''}`}>
      <div className="edi-ligne" onClick={onBasculer}>
        <div className="edi-date"><b>{post.jourNumero}</b><span>{post.mois}</span></div>
        <div className="edi-main">
          <span className={`edi-pill ${post.format}`}>{FORMATS_POST[post.format] ?? post.format}</span>
          {post.verrouille && (
            <span className="edi-pill verrou" title="Contenu arrêté : ne pas retoucher">
              🔒 Verrouillé
            </span>
          )}
          <span className="edi-meta">{post.jour} {post.date}</span>
          {/* Le hook peut contenir des retours à la ligne voulus (plan S2-S4). */}
          <div className="edi-hook edi-hook-multi">{post.hook}</div>
          <div className="edi-meta">{post.pilier} · <em>CTA : {post.ctaType}</em></div>
        </div>
        <div className="edi-side">
          <button
            type="button"
            className="edi-statut"
            data-s={post.statut}
            disabled={occupe}
            onClick={(e) => {
              e.stopPropagation();
              onCyclerStatut();
            }}
          >
            {post.statut}
          </button>
          <span className="edi-chev">▾</span>
        </div>
      </div>

      {ouvert && (
        <div className="edi-corps">
          <BlocEditable
            titre="Hook"
            valeur={post.hook}
            occupe={occupe}
            mono={false}
            onEnregistrer={(v) => onEnregistrerTextes({ hook: v })}
          />
          <BlocEditable
            titre="Déroulé visuel"
            valeur={post.visuel}
            occupe={occupe}
            onEnregistrer={(v) => onEnregistrerTextes({ visuel: v })}
          />
          <BlocEditable
            titre="Légende complète"
            valeur={post.legende}
            occupe={occupe}
            action={<BoutonCopier texte={post.legende} />}
            onEnregistrer={(v) => onEnregistrerTextes({ legende: v })}
          />
          <BlocEditable
            titre="Hashtags"
            valeur={post.hashtags}
            occupe={occupe}
            mono={false}
            action={<BoutonCopier texte={post.hashtags} />}
            onEnregistrer={(v) => onEnregistrerTextes({ hashtags: v })}
          />
          {/* ⚠ Toujours affiché, même sans note existante (contrairement à
              avant) : sinon impossible d'AJOUTER une note à un post qui n'en
              avait pas — le bouton « Modifier » doit rester atteignable. */}
          <BlocEditable
            titre="À surveiller"
            valeur={post.note}
            occupe={occupe}
            mono={false}
            onEnregistrer={(v) => onEnregistrerTextes({ note: v })}
          />

          {/* Production et justification : issus du plan, en lecture seule —
              ce sont des consignes de fabrication et des arbitrages, pas du
              contenu qu'on retouche au fil de l'eau comme une légende. */}
          {post.production && (
            <div className="edi-sec">
              <div className="edi-sech">À produire</div>
              <div className="edi-box mono">{post.production}</div>
            </div>
          )}
          {post.pourquoi && (
            <div className="edi-sec">
              <div className="edi-sech">Pourquoi ce post, ici</div>
              <div className="edi-box edi-pourquoi">{post.pourquoi}</div>
            </div>
          )}

          <div className="edi-sec">
            <div className="edi-sech">Visuel</div>
            <div className="edi-visuel">
              <div className="edi-vignette">
                {post.visuelUrl ? (
                  <img src={`/api/editorial/visuel/${post.numero}`} alt={`Visuel ${post.numero}`} />
                ) : (
                  'Aucun visuel'
                )}
              </div>
              <div className="edi-vchamps">
                <input
                  ref={fichierRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onTeleverserVisuel(f);
                    e.target.value = '';
                  }}
                />
                <button type="button" className="bouton discret" disabled={occupe} onClick={() => fichierRef.current?.click()}>
                  {post.visuelUrl ? 'Remplacer le visuel' : 'Ajouter un visuel'}
                </button>
                <div className="edi-resultats">
                  <ChampResultat label="Vues" valeur={vues} onChange={setVues} />
                  <ChampResultat label="Interactions" valeur={interactions} onChange={setInteractions} />
                  <ChampResultat label="Enregistr." valeur={enregistrements} onChange={setEnregistrements} />
                  <ChampResultat label="Partages" valeur={partages} onChange={setPartages} />
                </div>
                <button
                  type="button"
                  className="bouton discret"
                  disabled={occupe}
                  onClick={() =>
                    onEnregistrerResultats({
                      vues: versNombre(vues),
                      interactions: versNombre(interactions),
                      enregistrements: versNombre(enregistrements),
                      partages: versNombre(partages),
                    })
                  }
                >
                  Enregistrer les résultats
                </button>
                <p className="edi-hint">À remplir 48 h après publication, depuis les statistiques du post.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChampResultat({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="edi-rf">
      <span>{label}</span>
      <input
        type="number"
        className="champ"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}
