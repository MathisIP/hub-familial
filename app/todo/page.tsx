import Link from 'next/link';
import VueTodo from '@/components/todo/VueTodo';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerTodo } from '@/lib/todo/service';
import { cssTodoThemes } from '@/lib/todo/theme';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';

/** Rendu à chaque requête : les données Sheets ne doivent pas être figées. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'To-Do & Courses — Hub familial' };

export default async function PageTodo() {
  let contenu;
  try {
    const initial = await chargerTodo();
    contenu = <VueTodo initial={initial} />;
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">
          Impossible de charger la To-Do : {(e as Error).message}
        </p>
      );
  }

  return (
    <>
      {/* Rôles de couleur propres au module, injectés avec les mêmes
          sélecteurs [data-theme] que le socle. */}
      <style dangerouslySetInnerHTML={{ __html: cssTodoThemes() }} />

      <Link className="lien-retour" href="/">← {t('APP_TITRE')}</Link>

      <header className="entete">
        <div>
          <h1>{t('MOD_TODO')}</h1>
          <p>Tâches du foyer et liste de courses partagée</p>
        </div>
        <SelecteurTheme />
      </header>

      {contenu}
    </>
  );
}
