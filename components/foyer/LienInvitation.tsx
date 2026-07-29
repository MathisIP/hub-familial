'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';

/** Copie le lien d'invitation (origine courante + jeton) dans le presse-papier. */
export default function LienInvitation({ jeton }: { jeton: string }) {
  const tr = useT();
  const [copie, setCopie] = useState(false);

  function copier() {
    const url = `${window.location.origin}/rejoindre?jeton=${jeton}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopie(true);
        setTimeout(() => setCopie(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <button type="button" className="bouton discret" onClick={copier}>
      {copie ? tr('FOY_LIEN_COPIE') : tr('FOY_COPIER_LIEN')}
    </button>
  );
}
