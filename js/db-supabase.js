import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

const PAGINA = 1000; // Supabase returns at most 1000 rows per request
const SCHEMA = 'piante'; // separate schema inside the shared project (see supabase/schema.sql)

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

export function createSupabaseDb(url, anonKey) {
  // Persistent session: it's saved in the device's localStorage and renewed on its own
  // with the refresh token (which doesn't expire), so you log in only once per device.
  const sb = createClient(url, anonKey, {
    db: { schema: SCHEMA },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'piante-auth',
    },
  });

  return {
    async getUser() {
      // getSession() also renews the session if it expired while the app was closed
      const { data } = await sb.auth.getSession();
      return data.session?.user ?? null;
    },

    async accedi(email, password) {
      const data = ok(await sb.auth.signInWithPassword({ email, password }));
      return data.user;
    },
    async esci() {
      await sb.auth.signOut({ scope: 'local' }); // logs out only this device
    },

    async caricaTutto() {
      // the project's logins are shared: check the email is on the list
      if (!ok(await sb.rpc('autorizzato'))) {
        throw new Error('Questa email non è autorizzata a usare l\'app.');
      }
      const [piante, tipi] = await Promise.all([
        sb.from('piante').select('id,nome,icona,archiviata').order('nome').then(ok),
        sb.from('tipi_azione').select('*').order('ordine').then(ok),
      ]);
      const eventi = [];
      for (let da = 0; ; da += PAGINA) {
        const pagina = ok(
          await sb
            .from('eventi')
            .select('id,pianta_id,data,nota,autore,creato_il,evento_azioni(azione)')
            .order('data')
            .order('id')
            .range(da, da + PAGINA - 1)
        );
        for (const e of pagina) {
          eventi.push({
            id: e.id,
            pianta_id: e.pianta_id,
            data: e.data,
            nota: e.nota,
            autore: e.autore,
            creato_il: e.creato_il,
            azioni: e.evento_azioni.map((a) => a.azione),
          });
        }
        if (pagina.length < PAGINA) break;
      }
      return { piante, tipi, eventi };
    },

    async aggiungiPianta({ nome, icona }) {
      return ok(await sb.from('piante').insert({ nome, icona }).select('id,nome,icona,archiviata').single());
    },
    async aggiornaPianta(id, modifiche) {
      ok(await sb.from('piante').update(modifiche).eq('id', id));
    },
    async registraEvento(piantaId, data, azioni, nota = null) {
      return ok(
        await sb.rpc('registra_evento', { p_pianta_id: piantaId, p_data: data, p_azioni: azioni, p_nota: nota })
      );
    },
    async eliminaEvento(id) {
      ok(await sb.from('eventi').delete().eq('id', id));
    },
  };
}
