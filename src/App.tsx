import { useState, useEffect, useCallback, type FC, type ReactNode, type ChangeEvent } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Auth {
  email: string;
  password: string;
  nombre?: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  pais: string;
  rol: "admin" | "usuario";
  fecha_registro?: string;
}

interface Movie {
  id: number;
  title: string;
  year: number;
  duration?: number;
  synopsis?: string;
  poster_url?: string;
}

interface MovieDetail extends Movie {
  genres?: { id: number; name: string }[];
  directors?: { id: number; name: string }[];
  actors?: { id: number; name: string; role?: string }[];
  reviews?: { id: number; author: string; rating: number; comment?: string }[];
}

interface ForumThread {
  id: string;
  title: string;
  body: string;
  userId: string;
  movieId?: string;
  votes: number;
  date?: string;
}

interface Post {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  votes: number;
  date?: string;
}

interface Message {
  id: string;
  threadId: string;
  userId: string;
  text: string;
  timestamp?: string;
}

interface MoviesResponse {
  data: Movie[];
  total: number;
  page: number;
  limit: number;
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = {
  usuarios: "http://localhost:8000",    // solo para login/registro
  peliculas: "http://localhost:3000/api", // solo para catálogo directo
  foro: "http://balanceadormvs-191264992.us-east-1.elb.amazonaws.com:8080",
  orquestador: "http://localhost:8004",  // ← MS4
} as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function fetchJSON<T>(url: string, opts: RequestInit = {}): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(opts.headers as Record<string, string>) },
      ...opts,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } catch (e) {
    console.error(e);
    return null;
  }
}

const authHeader = (email: string, pass: string): Record<string, string> => ({
  Authorization: "Basic " + btoa(`${email}:${pass}`),
});

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon: FC<{ path: string; size?: number }> = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const Icons: Record<string, string> = {
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  film:    "M19.82 2H4.18A2.18 2.18 0 0 0 2 4.18v15.64A2.18 2.18 0 0 0 4.18 22h15.64A2.18 2.18 0 0 0 22 19.82V4.18A2.18 2.18 0 0 0 19.82 2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5",
  forum:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trash:   "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  plus:    "M12 5v14M5 12h14",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  search:  "M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5zM16 16l4.5 4.5",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  logout:  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  thread:  "M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.994 1.994 0 0 1-1.414-.586m0 0L11 14h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2v4l.586-.586z",
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
type BadgeColor = "green" | "blue" | "purple" | "slate" | "red";
const Badge: FC<{ children: ReactNode; color?: BadgeColor }> = ({ children, color = "slate" }) => {
  const colors: Record<BadgeColor, string> = {
    green:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    blue:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    slate:  "bg-slate-500/15 text-slate-400 border-slate-500/30",
    red:    "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const Card: FC<{ children: ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

const StatCard: FC<{ icon: string; label: string; value: number | null; color: "blue" | "green" | "purple" }> = ({ icon, label, value, color }) => {
  const colors = {
    blue:   "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green:  "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5 flex items-center gap-4`}>
      <div className="text-current opacity-80"><Icon path={icon} size={28} /></div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5">{value ?? "—"}</p>
      </div>
    </div>
  );
};

type BtnVariant = "primary" | "danger" | "ghost";
type BtnSize = "sm" | "md";
const Btn: FC<{ onClick?: (e:React.MouseEvent<HTMLButtonElement>) => void; children: ReactNode; variant?: BtnVariant; size?: BtnSize; disabled?: boolean }> = ({
  onClick, children, variant = "primary", size = "md", disabled = false,
}) => {
  const base = "inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes: Record<BtnSize, string>    = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    danger:  "bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30",
    ghost:   "bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
};

const Input: FC<{ label?: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string }> = ({
  label, ...props
}) => (
  <div>
    {label && <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>}
    <input
      {...props}
      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
    />
  </div>
);

const Modal: FC<{ title: string; onClose: () => void; children: ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h3 className="text-white font-semibold">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const EmptyState: FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-16 text-slate-500 text-sm">{message}</div>
);

const Spinner: FC = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const LoginView: FC<{ onLogin: (auth: Auth) => void }> = ({ onLogin }) => {
  const [form, setForm]     = useState({ email: "", password: "", nombre: "", pais: "" });
  const [mode, setMode]     = useState<"login" | "register">("login");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    if (mode === "login") {
      const res = await fetchJSON<{ mensaje: string }>(`${API.usuarios}/auth/login`, {
        headers: authHeader(form.email, form.password),
      });
      if (res) onLogin({ email: form.email, password: form.password, nombre: res.mensaje });
      else setError("Credenciales incorrectas");
    } else {
      const res = await fetchJSON<Usuario>(`${API.usuarios}/auth/registro`, {
        method: "POST",
        body: JSON.stringify({ nombre: form.nombre, email: form.email, password: form.password, pais: form.pais }),
      });
      if (res?.id) { setMode("login"); setError(""); }
      else setError("Error al registrarse");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon path={Icons.film} size={28} />
          </div>
          <h1 className="text-white text-2xl font-bold">CineCloud</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de administración</p>
        </div>
        <Card className="p-6 space-y-4">
          {mode === "register" && (
            <>
              <Input label="Nombre" placeholder="Tu nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              <Input label="País" placeholder="Perú" value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
            </>
          )}
          <Input label="Email" type="email" placeholder="admin@mail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Contraseña" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Btn onClick={handle} disabled={loading} size="md" variant="primary">
            {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Registrarse"}
          </Btn>
          <p className="text-slate-400 text-xs text-center">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button onClick={() => setMode(m => m === "login" ? "register" : "login")} className="text-blue-400 hover:underline">
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};

// ─── USUARIOS TAB ─────────────────────────────────────────────────────────────
const UsuariosTab: FC<{ auth: Auth }> = ({ auth }) => {
  const [users, setUsers]     = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ type: string; data: Usuario } | null>(null);
  const [form, setForm]       = useState({ nombre: "", pais: "" });
  const [search, setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchJSON<Usuario[]>(`${API.usuarios}/usuarios`, {
      headers: authHeader(auth.email, auth.password),
    });
    setUsers(res || []);
    setLoading(false);
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (id: number) => {
    await fetchJSON(`${API.usuarios}/usuarios/${id}`, {
      method: "DELETE",
      headers: authHeader(auth.email, auth.password),
    });
    load();
  };

  const updateUser = async () => {
    if (!modal) return;
    await fetchJSON(`${API.usuarios}/usuarios/${modal.data.id}`, {
      method: "PUT",
      headers: authHeader(auth.email, auth.password),
      body: JSON.stringify({ nombre: form.nombre, pais: form.pais }),
    });
    setModal(null); load();
  };

  const filtered = users.filter(u =>
    u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Icon path={Icons.search} size={14} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuarios..."
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70" />
        </div>
        <Btn onClick={load} variant="ghost" size="sm"><Icon path={Icons.refresh} size={14} />Actualizar</Btn>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No hay usuarios" /> : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["ID", "Nombre", "Email", "País", "Rol", "Registro", ""].map(h => (
                  <th key={h} className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{u.id}</td>
                  <td className="px-4 py-3 text-white font-medium">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{u.pais}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.rol === "admin" ? "purple" : "slate"}>{u.rol}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString("es") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Btn size="sm" variant="ghost" onClick={() => { setForm({ nombre: u.nombre, pais: u.pais }); setModal({ type: "edit", data: u }); }}>
                        Editar
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => deleteUser(u.id)}>
                        <Icon path={Icons.trash} size={12} />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modal?.type === "edit" && (
        <Modal title="Editar Usuario" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <Input label="País" value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
            <div className="flex gap-2 justify-end pt-2">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={updateUser}>Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};


const PeliculasTab: FC<{ auth: Auth }> = ({ auth }) => {
  const [movies, setMovies]       = useState<Movie[]>([]);
  const [loading, setLoading]     = useState(true);
  const [detail, setDetail]       = useState<MovieDetail | null>(null);
  const [search, setSearch]       = useState("");
  const [usuario, setUsuario]     = useState<Usuario | null>(null);
  const [reviewForm, setReviewForm] = useState({ author: "", rating: "", comment: "" });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [vistas, setVistas]       = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchJSON<MoviesResponse>(`${API.peliculas}/movies?limit=50`);
    setMovies(res?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetchJSON<Usuario>(`${API.usuarios}/auth/me`, {
        headers: authHeader(auth.email, auth.password),
      });
      if (res) setUsuario(res);
    };
    loadUser();
  }, [auth]);

  useEffect(() => {
    const loadVistas = async () => {
      if (!usuario) return;
      const res = await fetchJSON<any[]>(`${API.usuarios}/usuarios/${usuario.id}/peliculas_vistas`, {
        headers: authHeader(auth.email, auth.password),
      });
      if (res) setVistas(res.map(v => v.pelicula_id));
    };
    loadVistas();
  }, [usuario]);

  const openDetail = async (id: number) => {
    const res = await fetchJSON<MovieDetail>(`${API.peliculas}/movies/${id}`);
    if (res) setDetail(res);
  };

  const toggleVista = async (e: React.MouseEvent, movieId: number) => {
    e.stopPropagation();
    if (!usuario) return;

    if (vistas.includes(movieId)) {
      await fetchJSON(`${API.usuarios}/interno/usuarios/${usuario.id}/vista/${movieId}`, {
        method: "DELETE",
      });
      setVistas(vistas.filter(id => id !== movieId));
    } else {
      await fetchJSON(`${API.usuarios}/interno/usuarios/${usuario.id}/vista/${movieId}`, {
        method: "POST",
        headers: authHeader(auth.email, auth.password),
      });
      setVistas([...vistas, movieId]);
    }
  };

  const addReview = async () => {
    if (!detail || !reviewForm.author || !reviewForm.rating) return;
    setReviewLoading(true);
    await fetchJSON(`${API.peliculas}/movies/${detail.id}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        author: reviewForm.author,
        rating: parseFloat(reviewForm.rating),
        comment: reviewForm.comment,
      }),
    });
    const updated = await fetchJSON<MovieDetail>(`${API.peliculas}/movies/${detail.id}`);
    if (updated) setDetail(updated);
    setReviewForm({ author: "", rating: "", comment: "" });
    setReviewLoading(false);
  };

  const filtered = movies.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Icon path={Icons.search} size={14} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar películas..."
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70" />
        </div>
        <Btn onClick={load} variant="ghost" size="sm"><Icon path={Icons.refresh} size={14} /></Btn>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No hay películas" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <Card key={m.id} className="p-4 hover:border-slate-500 transition-colors cursor-pointer" onClick={() => openDetail(m.id)}>
              {m.poster_url && (
                <img src={m.poster_url} alt={m.title}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                  onError={e => (e.currentTarget.style.display = "none")} />
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{m.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{m.year}{m.duration ? ` · ${m.duration} min` : ""}</p>
                </div>
                <button
                  onClick={(e) => toggleVista(e, m.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${vistas.includes(m.id) ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25" : "bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700"}`}
                >
                  <Icon path={Icons.eye} size={11} />
                  {vistas.includes(m.id) ? "Visto ✓" : "Marcar"}
                </button>
              </div>
              {m.synopsis && <p className="text-slate-400 text-xs mt-2 line-clamp-2">{m.synopsis}</p>}
            </Card>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">{detail.title}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => toggleVista(e, detail.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${vistas.includes(detail.id) ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25" : "bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700"}`}
                >
                  <Icon path={Icons.eye} size={12} />
                  {vistas.includes(detail.id) ? "Visto ✓" : "Marcar como vista"}
                </button>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 flex-wrap">
                <Badge color="slate">{detail.year}</Badge>
                {detail.duration && <Badge color="slate">{detail.duration} min</Badge>}
                {detail.genres?.map(g => <Badge key={g.id} color="blue">{g.name}</Badge>)}
              </div>
              {detail.synopsis && (
                <Card className="p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Sinopsis</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{detail.synopsis}</p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(detail.directors?.length ?? 0) > 0 && (
                  <Card className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Directores</p>
                    <div className="space-y-1">
                      {detail.directors!.map(d => (
                        <p key={d.id} className="text-slate-300 text-sm">{d.name}</p>
                      ))}
                    </div>
                  </Card>
                )}
                {(detail.actors?.length ?? 0) > 0 && (
                  <Card className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Actores</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.actors!.map(a => (
                        <span key={a.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{a.name}</span>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
              <Card className="p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                  Reseñas ({detail.reviews?.length ?? 0})
                </p>
                <div className="space-y-3 mb-4">
                  {(detail.reviews?.length ?? 0) === 0 && (
                    <p className="text-slate-500 text-xs">Sin reseñas aún</p>
                  )}
                  {detail.reviews?.map(r => (
                    <div key={r.id} className="border-b border-slate-700/40 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{r.author}</span>
                        <span className="text-yellow-400 text-sm">★ {r.rating}/10</span>
                      </div>
                      {r.comment && <p className="text-slate-400 text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-700/40 pt-4 space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Añadir reseña</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Tu nombre"
                      value={reviewForm.author}
                      onChange={e => setReviewForm(f => ({ ...f, author: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
                    />
                    <input
                      placeholder="Calificación (0-10)"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={reviewForm.rating}
                      onChange={e => setReviewForm(f => ({ ...f, rating: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
                    />
                  </div>
                  <input
                    placeholder="Comentario (opcional)"
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
                  />
                  <Btn variant="primary" size="sm" onClick={addReview} disabled={!reviewForm.author || !reviewForm.rating || reviewLoading}>
                    {reviewLoading ? "Enviando..." : "Publicar reseña"}
                  </Btn>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── FORO TAB ─────────────────────────────────────────────────────────────────
const ForoTab: FC = () => {
  const [threads, setThreads]   = useState<ForumThread[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<"thread" | null>(null);
  const [selected, setSelected] = useState<ForumThread | null>(null);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [form, setForm]         = useState({ title: "", body: "", userId: "", movieId: "" });
  const [msgForm, setMsgForm]   = useState({ text: "", userId: "" });
  const [postForm, setPostForm] = useState({ body: "", userId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchJSON<ForumThread[]>(`${API.foro}/api/threads`);
    setThreads(res || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openThread = async (thread: ForumThread) => {
    setSelected(thread);
    const [p, m] = await Promise.all([
      fetchJSON<Post[]>(`${API.foro}/api/posts/thread/${thread.id}`),
      fetchJSON<Message[]>(`${API.foro}/api/messages/thread/${thread.id}`),
    ]);
    setPosts(p || []);
    setMessages(m || []);
  };

  const createThread = async () => {
    await fetchJSON(`${API.foro}/api/threads`, {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        body: form.body,
        userId: form.userId,
        ...(form.movieId && { movieId: form.movieId }),
      }),
    });
    setModal(null);
    setForm({ title: "", body: "", userId: "", movieId: "" });
    load();
  };

  const deleteThread = async (id: string) => {
    await fetchJSON(`${API.foro}/api/threads/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    load();
  };

  const sendMessage = async () => {
    if (!selected) return;
    await fetchJSON(`${API.foro}/api/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId: selected.id, userId: msgForm.userId, text: msgForm.text }),
    });
    setMsgForm({ text: "", userId: "" });
    openThread(selected);
  };

  const createPost = async () => {
    if (!selected) return;
    await fetchJSON(`${API.foro}/api/posts`, {
      method: "POST",
      body: JSON.stringify({ threadId: selected.id, userId: postForm.userId, body: postForm.body }),
    });
    setPostForm({ body: "", userId: "" });
    openThread(selected);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-white font-medium flex-1">Threads ({threads.length})</h3>
        <Btn onClick={() => setModal("thread")} variant="primary" size="sm"><Icon path={Icons.plus} size={14} />Nuevo Thread</Btn>
        <Btn onClick={load} variant="ghost" size="sm"><Icon path={Icons.refresh} size={14} /></Btn>
      </div>

      <div className={`grid gap-4 ${selected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Lista threads */}
        <div className="space-y-2">
          {loading ? <Spinner /> : threads.length === 0 ? <EmptyState message="No hay threads" /> :
            threads.map(t => (
              <Card key={t.id} className={`p-4 cursor-pointer hover:border-slate-500 transition-all ${selected?.id === t.id ? "border-blue-500/50 bg-blue-500/5" : ""}`}
                onClick={() => openThread(t)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{t.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{t.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">👤 {t.userId}</span>
                      {t.movieId && <Badge color="blue">Movie #{t.movieId}</Badge>}
                      <span className="text-xs text-slate-500">▲ {t.votes}</span>
                    </div>
                  </div>
                  <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); deleteThread(t.id); }}>
                    <Icon path={Icons.trash} size={12} />
                  </Btn>
                </div>
              </Card>
            ))
          }
        </div>

        {/* Detalle thread */}
        {selected && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-semibold text-sm truncate">{selected.title}</h4>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
            </div>

            {/* Posts */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Posts ({posts.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {posts.map(p => (
                  <div key={p.id} className="bg-slate-700/40 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-blue-400 font-medium">{p.userId}</span>
                      <span className="text-xs text-slate-500">▲ {p.votes}</span>
                    </div>
                    <p className="text-slate-300 text-xs">{p.body}</p>
                  </div>
                ))}
                {posts.length === 0 && <p className="text-slate-500 text-xs">Sin posts</p>}
              </div>
              <div className="mt-2 space-y-2">
                <Input placeholder="User ID" value={postForm.userId} onChange={e => setPostForm(f => ({ ...f, userId: e.target.value }))} />
                <div className="flex gap-2">
                  <input value={postForm.body} onChange={e => setPostForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Escribe un post..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70" />
                  <Btn size="sm" variant="primary" onClick={createPost} disabled={!postForm.body || !postForm.userId}>Post</Btn>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Mensajes ({messages.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.map(m => (
                  <div key={m.id} className="bg-slate-700/40 rounded-lg p-3 flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-slate-300 shrink-0">
                      {m.userId?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">{m.userId}</span>
                      <p className="text-slate-300 text-xs mt-0.5">{m.text}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-slate-500 text-xs">Sin mensajes</p>}
              </div>
              <div className="mt-2 space-y-2">
                <Input placeholder="User ID" value={msgForm.userId} onChange={e => setMsgForm(f => ({ ...f, userId: e.target.value }))} />
                <div className="flex gap-2">
                  <input value={msgForm.text} onChange={e => setMsgForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70" />
                  <Btn size="sm" variant="primary" onClick={sendMessage} disabled={!msgForm.text || !msgForm.userId}>Enviar</Btn>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {modal === "thread" && (
        <Modal title="Nuevo Thread" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input label="User ID *" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
            <Input label="Movie ID (opcional)" value={form.movieId} onChange={e => setForm(f => ({ ...f, movieId: e.target.value }))} />
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Contenido</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={3} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 resize-none" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={createThread} disabled={!form.title || !form.userId}>Crear</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const PerfilTab: FC<{ auth: Auth }> = ({ auth }) => {
  const [usuario, setUsuario]     = useState<Usuario | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({ nombre: "", pais: "" });
  const [success, setSuccess]     = useState(false);
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [detail, setDetail]       = useState<MovieDetail | null>(null);
  const [showAllVistas, setShowAllVistas] = useState(false);

  const loadData = async () => {
    const res = await fetchJSON<Usuario>(`${API.usuarios}/auth/me`, {
      headers: authHeader(auth.email, auth.password),
    });
    if (res) {
      setUsuario(res);
      setForm({ nombre: res.nombre, pais: res.pais });
      const vistas = await fetchJSON<any[]>(`${API.usuarios}/usuarios/${res.id}/peliculas_vistas`, {
        headers: authHeader(auth.email, auth.password),
      });
      setPeliculas(vistas || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [auth]);

  const update = async () => {
    if (!usuario) return;
    await fetchJSON(`${API.usuarios}/usuarios/${usuario.id}`, {
      method: "PUT",
      headers: authHeader(auth.email, auth.password),
      body: JSON.stringify({ nombre: form.nombre, pais: form.pais }),
    });
    setUsuario(u => u ? { ...u, ...form } : u);
    setEditing(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const openDetail = async (peliculaId: number) => {
    const res = await fetchJSON<MovieDetail>(`${API.peliculas}/movies/${peliculaId}`);
    if (res) setDetail(res);
  };

  const quitarVista = async (e: React.MouseEvent, peliculaId: number) => {
    e.stopPropagation();
    if (!usuario) return;
    await fetchJSON(`${API.usuarios}/interno/usuarios/${usuario.id}/vista/${peliculaId}`, {
      method: "DELETE",
    });
    setPeliculas(prev => prev.filter(p => p.pelicula_id !== peliculaId));
  };

  if (loading) return <Spinner />;
  if (!usuario) return <EmptyState message="No se pudo cargar el perfil" />;

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
          <p className="text-slate-400 text-sm mt-0.5">Conectado como <span className="text-blue-400">{auth.email}</span></p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar perfil
        </Btn>
      </div>

      {/* Info card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {usuario.nombre?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{usuario.nombre}</p>
            <p className="text-slate-400 text-sm">{usuario.email}</p>
            <Badge color={usuario.rol === "admin" ? "purple" : "slate"}>{usuario.rol}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0">
          {[
            { label: "Nombre",   value: usuario.nombre },
            { label: "País",     value: usuario.pais },
            { label: "Email",    value: usuario.email },
            { label: "Registro", value: usuario.fecha_registro ? new Date(usuario.fecha_registro).toLocaleDateString("es") : "—" },
          ].map((row, i) => (
            <div key={row.label} className={`py-3 ${i % 2 === 0 ? "pr-6 border-r border-slate-700/40" : "pl-6"} ${i < 2 ? "border-b border-slate-700/40" : ""}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">{row.label}</p>
              <p className="text-white text-sm">{row.value}</p>
            </div>
          ))}
        </div>
        {success && <p className="text-emerald-400 text-xs mt-4">✓ Perfil actualizado correctamente</p>}
      </Card>

      {/* Películas vistas */}
      <Card className="p-6">
        {/* Header clickeable para ver todas */}
        <div
          className="flex items-center justify-between cursor-pointer group mb-4"
          onClick={() => setShowAllVistas(true)}
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold group-hover:text-slate-300 transition-colors">
            Películas vistas ({peliculas.length})
          </p>
          <span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">Ver todas →</span>
        </div>

        {peliculas.length === 0 ? (
          <EmptyState message="No hay películas marcadas como vistas" />
        ) : (
          <div className="space-y-1">
            {peliculas.slice(0, 5).map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0 cursor-pointer hover:bg-slate-700/20 rounded-lg px-2 transition-colors group"
                onClick={() => openDetail(p.pelicula_id)}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                  <Icon path={Icons.film} size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">Película #{p.pelicula_id}</p>
                  {p.fecha_vista && <p className="text-slate-400 text-xs">{new Date(p.fecha_vista).toLocaleDateString("es")}</p>}
                </div>
                {/* Botón quitar vista — verde estilo completado */}
                <button
                  onClick={(e) => quitarVista(e, p.pelicula_id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                >
                  <Icon path={Icons.eye} size={11} /> Visto ✓
                </button>
              </div>
            ))}
            {peliculas.length > 5 && (
              <p
                className="text-xs text-blue-400 text-center pt-2 cursor-pointer hover:text-blue-300"
                onClick={() => setShowAllVistas(true)}
              >
                Ver {peliculas.length - 5} más...
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Modal todas las películas vistas */}
      {showAllVistas && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">Películas vistas ({peliculas.length})</h2>
              <button onClick={() => setShowAllVistas(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2">
              {peliculas.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3 px-4 border border-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700/20 transition-colors group"
                  onClick={() => { openDetail(p.pelicula_id); setShowAllVistas(false); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <Icon path={Icons.film} size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Película #{p.pelicula_id}</p>
                    {p.fecha_vista && <p className="text-slate-400 text-xs">{new Date(p.fecha_vista).toLocaleDateString("es")}</p>}
                  </div>
                  <button
                    onClick={(e) => { quitarVista(e, p.pelicula_id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    <Icon path={Icons.eye} size={11} /> Visto ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detalle película */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">{detail.title}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 flex-wrap">
                <Badge color="slate">{detail.year}</Badge>
                {detail.duration && <Badge color="slate">{detail.duration} min</Badge>}
                {detail.genres?.map(g => <Badge key={g.id} color="blue">{g.name}</Badge>)}
              </div>
              {detail.synopsis && (
                <Card className="p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Sinopsis</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{detail.synopsis}</p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(detail.directors?.length ?? 0) > 0 && (
                  <Card className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Directores</p>
                    <div className="space-y-1">
                      {detail.directors!.map(d => (
                        <p key={d.id} className="text-slate-300 text-sm">{d.name}</p>
                      ))}
                    </div>
                  </Card>
                )}
                {(detail.actors?.length ?? 0) > 0 && (
                  <Card className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Actores</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.actors!.map(a => (
                        <span key={a.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{a.name}</span>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
              {(detail.reviews?.length ?? 0) > 0 && (
                <Card className="p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                    Reseñas ({detail.reviews?.length ?? 0})
                  </p>
                  <div className="space-y-3">
                    {detail.reviews?.map(r => (
                      <div key={r.id} className="border-b border-slate-700/40 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{r.author}</span>
                          <span className="text-yellow-400 text-sm">★ {r.rating}/10</span>
                        </div>
                        {r.comment && <p className="text-slate-400 text-sm">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editing && (
        <Modal title="Editar perfil" onClose={() => setEditing(false)}>
          <div className="space-y-4">
            <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <Input label="País" value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
            <div className="flex gap-2 justify-end pt-1">
              <Btn variant="ghost" onClick={() => setEditing(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={update}>Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
const OverviewTab: FC<{ auth: Auth }> = ({ auth }) => {
  const [stats, setStats] = useState<{ usuarios: number | null; peliculas: number | null; threads: number | null }>({
    usuarios: null, peliculas: null, threads: null,
  });

  useEffect(() => {
    const load = async () => {
      const [u, p, t] = await Promise.all([
        fetchJSON<Usuario[]>(`${API.usuarios}/usuarios`, { headers: authHeader(auth.email, auth.password) }),
        fetchJSON<MoviesResponse>(`${API.peliculas}/movies?limit=1`),
        fetchJSON<ForumThread[]>(`${API.foro}/api/threads`),
      ]);
      setStats({ usuarios: u?.length ?? 0, peliculas: p?.total ?? 0, threads: t?.length ?? 0 });
    };
    load();
  }, [auth]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Icons.users}  label="Usuarios"  value={stats.usuarios}  color="blue" />
        <StatCard icon={Icons.film}   label="Películas" value={stats.peliculas} color="green" />
        <StatCard icon={Icons.thread} label="Threads"   value={stats.threads}   color="purple" />
      </div>
      <Card className="p-5">
        <h3 className="text-white font-semibold mb-3">Servicios activos</h3>
        <div className="space-y-2">
          {[
            { name: "API Usuarios (Python / FastAPI)", port: "8000", color: "green" as BadgeColor },
            { name: "API Películas (Node / Fastify)",  port: "3000", color: "blue"  as BadgeColor },
            { name: "API Foro (Java / Spring Boot)",   port: "8080", color: "purple" as BadgeColor },
          ].map(s => (
            <div key={s.port} className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
              <span className="text-slate-300 text-sm">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-mono">:{s.port}</span>
                <Badge color={s.color}>activo</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── APP ──────────────────────────────────────────────────────────────────────
type TabId = "overview" | "usuarios" | "peliculas" | "foro" | "perfil";
interface Tab { id: TabId; label: string; icon: string }

const TABS: Tab[] = [
  { id: "overview",  label: "Resumen",   icon: Icons.star },
  { id: "usuarios",  label: "Usuarios",  icon: Icons.users },
  { id: "peliculas", label: "Películas", icon: Icons.film },
  { id: "foro",      label: "Foro",      icon: Icons.forum },
  {id: "perfil",    label: "Mi Perfil", icon: Icons.users }, 
];

export default function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [tab, setTab]   = useState<TabId>("overview");

  if (!auth) return <LoginView onLogin={setAuth} />;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-56 bg-slate-800/80 border-r border-slate-700/50 backdrop-blur-sm flex flex-col z-10">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Icon path={Icons.film} size={16} />
            </div>
            <span className="text-white font-bold">CineCloud</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}>
              <Icon path={t.icon} size={16} />{t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700/50">
          <button onClick={() => setAuth(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all">
            <Icon path={Icons.logout} size={14} />Cerrar sesión
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-56 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{TABS.find(t => t.id === tab)?.label}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Conectado como <span className="text-blue-400">{auth.email}</span></p>
        </div>
        {tab === "overview"  && <OverviewTab auth={auth} />}
        {tab === "usuarios"  && <UsuariosTab auth={auth} />}
        {tab === "peliculas" && <PeliculasTab auth={auth} />}
        {tab === "foro"      && <ForoTab />}
        {tab === "perfil"    && <PerfilTab auth={auth} />}
      </div>
    </div>
  );
}
