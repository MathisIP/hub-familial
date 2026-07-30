import VueTodo from '@/components/todo/VueTodo';
import { chargerTodo } from '@/lib/todo/service';
import { cssTodoThemes } from '@/lib/todo/theme';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/** Rendu à chaque requête : les données Sheets ne doivent pas être figées. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'To-Do & Courses — Nestync' };

export default async function PageTodo() {
  await exigerAcces();
  const langue = await langueCourante();
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
          {t('G_ERR_PAGE', langue)} {(e as Error).message}
        </p>
      );
  }

  return (
    <>
      {/* Rôles de couleur propres au module, injectés avec les mêmes
          sélecteurs [data-theme] que le socle. */}
      <style dangerouslySetInnerHTML={{ __html: cssTodoThemes() }} />

      <header className="entete">
        <div>
          <h1>{t('MOD_TODO', langue)}</h1>
          <p>{t('SUB_TODO', langue)}</p>
        </div>
      </header>

      {contenu}
    </>
  );
}
