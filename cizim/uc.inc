struct V3 { float x, y, z; };
static inline V3 operator+(V3 a, V3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
static inline V3 operator-(V3 a, V3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
static inline V3 operator*(V3 a, float k) { return {a.x * k, a.y * k, a.z * k}; }
static inline float nokta(V3 a, V3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
static inline V3 capraz(V3 a, V3 b) { return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x}; }
static inline float boyu(V3 a) { return std::sqrt(nokta(a, a)); }
static inline V3 birim(V3 a) { float m = boyu(a); return m > 1e-9f ? a * (1 / m) : V3{0, 0, 1}; }

static const float TS = 2.5f, TXG = 170, TYU = 1010; static const int TW = 850, TH = 2550;
static uint8_t *ATX = nullptr, *KB = nullptr, *ATX2 = nullptr, *KB2 = nullptr; static bool kb2Var = false, kb2Bekle = false; static uint8_t *KS = nullptr, *KE = nullptr, *KF = nullptr, *KA = nullptr; static float* ZB0 = nullptr;
static const int DANS = 16; static uint8_t* DP[DANS] = {}; static int dpHazir = 0, dpSig = 0;   static int katman = 0;
static V3 sacKay{0, 0, 0}; static bool sisirArkaEk = false; static float* salDizi = nullptr; static int salSig = 0; static float* ZB = nullptr;
static int KW = 0, KH = 0, kbSig = 0, kbx0 = 0, kby0 = 0, kbw = 0, kbh = 0;
static float kS = 1, kOX = 0, kOY = 0, donDer = 0, cY = 1, sY = 0;
static bool dokuHazir = false, kizTazele = true, sonAtiyor = false, sacHafif = false; static int kSS = 2; static float sonKizX = -1, sonYaw = -999;
struct Poz { float x, yaw, faz, amp, cok; V3 sol, sag; bool jeton, hareket; float yon = 1; int plak = 0; };

static inline V3 dondur(V3 p) { return {p.x * cY + p.z * sY, p.y, -p.x * sY + p.z * cY}; }

static inline bool dokuAl(float x, float y, R& c) {
    float fx = (x + TXG) * TS - 0.5f, fy = (y + TYU) * TS - 0.5f;
    int ix = (int)std::floor(fx), iy = (int)std::floor(fy);
    if (ix < 0 || iy < 0 || ix >= TW - 1 || iy >= TH - 1) return false;
    float ax = fx - ix, ay = fy - iy; const uint8_t* p = ATX + 4 * (iy * TW + ix);
    float w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
    const uint8_t *q = p + 4, *r = p + 4 * TW, *s = r + 4;
    float a = p[3] * w00 + q[3] * w10 + r[3] * w01 + s[3] * w11;
    if (a < 150) return false;
    c.r = (p[0] * w00 + q[0] * w10 + r[0] * w01 + s[0] * w11) / a; c.g = (p[1] * w00 + q[1] * w10 + r[1] * w01 + s[1] * w11) / a;
    c.b = (p[2] * w00 + q[2] * w10 + r[2] * w01 + s[2] * w11) / a; c.a = 1;
    return true;
}

static inline R isik(V3 n, R a, float parlak) {
    V3 v = dondur(n);
    float dif = v.x * -0.34f + v.y * -0.42f + v.z * 0.84f, w = kis(dif * 0.60f + 0.42f, 0, 1);
    float sp = v.x * -0.177f + v.y * -0.219f + v.z * 0.958f; sp = sp > 0 ? std::pow(sp, 30.f) * parlak : 0;
    float k = (0.32f + 0.76f * w) * (0.78f + 0.22f * kis(v.z, 0, 1));
    return {a.r * k + sp, a.g * k * 0.97f + sp, a.b * k * 0.97f + sp, 1};
}
static inline R isikTen(V3 n, R a) {
    V3 v = dondur(n);
    float dif = v.x * -0.34f + v.y * -0.42f + v.z * 0.84f, w = kis(dif * 0.60f + 0.44f, 0, 1);
    float sp = v.x * -0.177f + v.y * -0.219f + v.z * 0.958f; sp = sp > 0 ? std::pow(sp, 44.f) * 0.10f : 0;
    R g{a.r * 0.80f, a.g * 0.60f, a.b * 0.58f, 1}, l{a.r * 1.02f + sp, a.g * 1.02f + sp, a.b * 1.02f + sp, 1};
    return kar(g, l, w);
}

static inline R kapla(V3 p, V3 n, R yedek) { float on = yum(0.02f, 0.30f, n.z); R tx; if (on > 0 && dokuAl(p.x, p.y, tx)) return kar(yedek, tx, on); return yedek; }

struct Kose { float sx, sy, z; V3 p, n; };
template <class Sh>
static void ucgen(const Kose& a, const Kose& b, const Kose& c, Sh& sh) {
    float alan = (b.sx - a.sx) * (c.sy - a.sy) - (b.sy - a.sy) * (c.sx - a.sx); if (std::fabs(alan) < 1e-6f) return;
    float mnx = a.sx < b.sx ? a.sx : b.sx, mxx = a.sx > b.sx ? a.sx : b.sx, mny = a.sy < b.sy ? a.sy : b.sy, mxy = a.sy > b.sy ? a.sy : b.sy;
    if (c.sx < mnx) mnx = c.sx; if (c.sx > mxx) mxx = c.sx; if (c.sy < mny) mny = c.sy; if (c.sy > mxy) mxy = c.sy;
    int x0 = (int)std::floor(mnx), x1 = (int)std::ceil(mxx), y0 = (int)std::floor(mny), y1 = (int)std::ceil(mxy);
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > KW) x1 = KW; if (y1 > KH) y1 = KH;
    float ia = 1 / alan;
    for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++) {
        float px = x + 0.5f, py = y + 0.5f;
        float w0 = ((b.sx - px) * (c.sy - py) - (b.sy - py) * (c.sx - px)) * ia, w1 = ((c.sx - px) * (a.sy - py) - (c.sy - py) * (a.sx - px)) * ia, w2 = 1 - w0 - w1;
        if (w0 < -0.002f || w1 < -0.002f || w2 < -0.002f) continue;
        float z = a.z * w0 + b.z * w1 + c.z * w2; int id = y * KW + x; if (z <= ZB[id]) continue;
        V3 p = a.p * w0 + b.p * w1 + c.p * w2, n = birim(a.n * w0 + b.n * w1 + c.n * w2);
        R cl = sh(p, n); if (cl.a < 0.5f) continue;
        ZB[id] = z; uint8_t* o = KB + 4 * id;
        o[0] = (uint8_t)(kis(cl.r, 0, 1) * 255); o[1] = (uint8_t)(kis(cl.g, 0, 1) * 255); o[2] = (uint8_t)(kis(cl.b, 0, 1) * 255); o[3] = 255;
    }
}

static V3 AP[170 * 90], AN[170 * 90]; static Kose AK[170 * 90];
template <class F, class Sh>
static void agCiz(int nu, int nv, F f, Sh sh, V3 merkez, bool sarU) {
    int su = nu + 1; bool nVar = false;
    for (int j = 0; j <= nv; j++) for (int i = 0; i <= nu; i++) { V3 P{0, 0, 0}, N{0, 0, 0}; bool v = false; f(i, j, P, N, v); AP[j * su + i] = P; AN[j * su + i] = N; if (v) nVar = true; }
    if (!nVar) for (int j = 0; j <= nv; j++) for (int i = 0; i <= nu; i++) {
        int i0 = i > 0 ? i - 1 : (sarU ? nu - 1 : 0), i1 = i < nu ? i + 1 : (sarU ? 1 : nu), j0 = j > 0 ? j - 1 : 0, j1 = j < nv ? j + 1 : nv;
        V3 P = AP[j * su + i], n = capraz(AP[j * su + i1] - AP[j * su + i0], AP[j1 * su + i] - AP[j0 * su + i]);
        if (boyu(n) < 1e-7f) n = P - merkez;
        n = birim(n); if (nokta(n, P - merkez) < 0) n = n * -1;
        AN[j * su + i] = n;
    }
    for (int k = 0; k < (nv + 1) * su; k++) { V3 q = dondur(AP[k]); AK[k] = {q.x * kS + kOX, q.y * kS + kOY, q.z, AP[k], AN[k]}; }
    for (int j = 0; j < nv; j++) for (int i = 0; i < nu; i++) {
        const Kose &a = AK[j * su + i], &b = AK[j * su + i + 1], &c = AK[(j + 1) * su + i + 1], &d = AK[(j + 1) * su + i];
        ucgen(a, b, c, sh); ucgen(a, c, d, sh);
    }
}

template <class Sd, class Ek, class Sh>
static void sisir(float cx, float cy, float rmax, Sd sdf, float Rk, float zOn, float zArka, Ek ek, Sh sh) {
    const int NU = 132, NV = 40; static float Rb[NU + 1];
    for (int i = 0; i < NU; i++) {
        float a = i * 2 * PI / NU, dx = std::cos(a), dy = std::sin(a), lo = 0, hi = rmax;
        for (int k = 0; k < 22; k++) { float m = (lo + hi) * 0.5f; if (sdf(cx + dx * m, cy + dy * m) < 0) lo = m; else hi = m; }
        Rb[i] = lo;
    }
    for (int yon = 0; yon < 2; yon++)
        agCiz(NU, NV, [&](int i, int j, V3& P, V3&, bool&) {
            int ii = i % NU; float a = ii * 2 * PI / NU, rho = std::sin(j / (float)NV * PI * 0.5f) * Rb[ii];
            float x = cx + std::cos(a) * rho, y = cy + std::sin(a) * rho, d = sdf(x, y); if (d > 0) d = 0;
            float t = d < -Rk ? 0 : Rk + d, z = std::sqrt(Rk * Rk - t * t);
            P = {x, y, yon == 0 ? (z + ek(x, y) * yum(0, 8, -d)) * zOn : -(z + (sisirArkaEk ? ek(x, y) * yum(0, 8, -d) : 0)) * zArka}; }, sh, V3{cx, cy, yon == 0 ? -1e5f : 1e5f}, true);
}

template <class Sh>
static void tup(const V3* c, const float* r, int n, Sh sh) {
    const int NU = 22;
    agCiz(NU, n + 1, [&](int i, int j, V3& P, V3& N, bool& v) {
        int k = j == 0 ? 0 : (j > n ? n - 1 : j - 1); float rr = (j == 0 || j > n) ? 0.01f : r[k];
        V3 t = birim(c[k < n - 1 ? k + 1 : k] - c[k > 0 ? k - 1 : k]);
        V3 a = capraz(t, V3{0, 0, 1}); if (boyu(a) < 1e-4f) a = V3{1, 0, 0}; a = birim(a); V3 b = capraz(t, a);
        float th = i * 2 * PI / NU; V3 yon = a * std::cos(th) + b * std::sin(th);
        P = c[k] + yon * rr; N = (j == 0) ? t * -1 : (j > n ? t : yon); v = true; }, sh, V3{0, 0, 0}, true);
}

template <class Sh>
static void elipsoid(V3 c, V3 r, Sh sh) {
    agCiz(28, 18, [&](int i, int j, V3& P, V3& N, bool& v) {
        float u = i * 2 * PI / 28, w = j * PI / 18, sw = std::sin(w);
        V3 q{sw * std::sin(u), -std::cos(w), sw * std::cos(u)};
        P = {c.x + q.x * r.x, c.y + q.y * r.y, c.z + q.z * r.z}; N = birim(V3{q.x / r.x, q.y / r.y, q.z / r.z}); v = true; }, sh, c, true);
}

static void tel3(const V3* p, int n, float r, R baz) {
    float rr = r * kS; if (rr < 0.55f) rr = 0.55f;
    V3 o = dondur(p[0]); float ox = o.x * kS + kOX, oy = o.y * kS + kOY;
    for (int i = 1; i < n; i++) {
        V3 q = dondur(p[i]); float qx = q.x * kS + kOX, qy = q.y * kS + kOY;
        V3 T = birim(q - o);
        float lt = T.x * -0.34f + T.y * -0.42f + T.z * 0.84f, ht = T.x * -0.177f + T.y * -0.219f + T.z * 0.958f;
        float df = std::sqrt(1 - lt * lt > 0 ? 1 - lt * lt : 0), sp = std::pow(std::sqrt(1 - ht * ht > 0 ? 1 - ht * ht : 0), 46.f);
        float k = 0.36f + 0.64f * df; R c{baz.r * k + sp * 0.26f, baz.g * k + sp * 0.25f, baz.b * k + sp * 0.23f, 1};
        int x0 = (int)std::floor((ox < qx ? ox : qx) - rr - 1), x1 = (int)std::ceil((ox > qx ? ox : qx) + rr + 1), y0 = (int)std::floor((oy < qy ? oy : qy) - rr - 1), y1 = (int)std::ceil((oy > qy ? oy : qy) + rr + 1);
        if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > KW) x1 = KW; if (y1 > KH) y1 = KH;
        float ex = qx - ox, ey = qy - oy, el = ex * ex + ey * ey + 1e-9f;
        for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++) {
            float wx = x + 0.5f - ox, wy = y + 0.5f - oy, h = kis((wx * ex + wy * ey) / el, 0, 1);
            float d = uz(wx - ex * h, wy - ey * h), a = rr - d + 0.5f; if (a <= 0) continue; if (a > 1) a = 1;
            float z = kar(o.z, q.z, h) + 1.2f; int id = y * KW + x; if (z < ZB[id]) continue;
            uint8_t* u = KB + 4 * id; float da = u[3] / 255.f, ta = a + da * (1 - a);
            u[0] = (uint8_t)((kis(c.r, 0, 1) * 255 * a + u[0] * da * (1 - a)) / ta); u[1] = (uint8_t)((kis(c.g, 0, 1) * 255 * a + u[1] * da * (1 - a)) / ta);
            u[2] = (uint8_t)((kis(c.b, 0, 1) * 255 * a + u[2] * da * (1 - a)) / ta); u[3] = (uint8_t)(ta * 255);
            if (a > 0.5f) ZB[id] = z - 1.2f + 0.02f;
        }
        o = q; ox = qx; oy = qy;
    }
}

struct Demet3 { V3 p0, p1, p2, p3, e1, e2; int tel; float gen, kivGen, kivTur, kivBas, koyu; int tohum; float r; int parca; };
static void demet3(const Demet3& D) {
    static const R ko = rgb(150, 132, 110), acik = rgb(255, 251, 242);
    static V3 pt[130];
    int N = sacHafif ? (D.parca + 2) / 3 : D.parca;
    for (int pas = 0; pas < 2; pas++) {
        int adet = pas == 0 ? (sacHafif ? 3 : 5) : (sacHafif ? (D.tel + 3) / 4 : D.tel);
        for (int k = 0; k < adet; k++) {
            int h = D.tohum * 131 + k * 17 + pas * 7919;
            float o1 = (sac(h) - 0.5f) * D.gen * 0.6f, o2 = (sac(h + 1) - 0.5f) * D.gen;
            float faz = sac(D.tohum * 53 + 5) * 6.2832f + (sac(h + 2) - 0.5f) * 1.1f;
            float A = D.kivGen * (0.75f + 0.5f * sac(h + 3)) * (pas == 0 ? 0.6f : 1), ton = sac(h + 4), boy = 1 - 0.12f * sac(h + 5);
            for (int i = 0; i <= N; i++) {
                float s = i / (float)N * boy, a = (1 - s) * (1 - s) * (1 - s), b = 3 * s * (1 - s) * (1 - s), c = 3 * s * s * (1 - s), d = s * s * s;
                V3 m = D.p0 * a + D.p1 * b + D.p2 * c + D.p3 * d + sacKay * ((c * 0.35f + d) * (D.parca >= 100 ? 1.f : 0.15f));
                float e = yum(D.kivBas, D.kivBas + 0.22f, s), ac = faz + D.kivTur * 6.2832f * s, yy = 0.25f + 0.75f * yum(0, 0.25f, s);
                pt[i] = m + D.e1 * (o1 * yy + A * e * 0.85f * std::cos(ac)) + D.e2 * (o2 * yy + A * e * std::sin(ac));
            }
            float v = pas == 0 ? 0.05f : kis(0.50f + 0.50f * ton - D.koyu, 0, 1);
            tel3(pt, N + 1, pas == 0 ? (sacHafif ? 3.0f : 2.0f) : (sacHafif ? D.r * 2.6f : D.r), kar(ko, acik, v));
        }
    }
}

static inline float yuzSdf(float x, float y) { return ymin(ymin(uDaire(x, y, 0, -940, 59), uElips(x, y, 0, -897, 48, 50), 30), uElips(x, y, 0, -867, 34, 27), 22); }
static inline float gs(float dx, float dy, float sx, float sy) { return std::exp(-(dx * dx) / (sx * sx) - (dy * dy) / (sy * sy)); }
static inline float yuzOzellik(float x, float yy) {
    float z = 2.4f * std::exp(-(x * x) / 60.f) * yum(-932, -912, yy) * (1 - yum(-892, -880, yy));
    z += 10.0f * gs(x, yy + 885, 6.5f, 6.0f) + 3.5f * (gs(x - 6.5f, yy + 881, 4.0f, 3.2f) + gs(x + 6.5f, yy + 881, 4.0f, 3.2f));
    z -= 5.0f * (gs(x - 27, yy + 911, 16, 9) + gs(x + 27, yy + 911, 16, 9));
    z += 4.5f * (gs(x - 36, yy + 882, 21, 16) + gs(x + 36, yy + 882, 21, 16));
    float yq = yy + 0.010f * x * x;
    z += 3.6f * gs(x, yq + 866.6f, 11.0f, 2.3f) - 1.6f * gs(x, yy + 870, 2.2f, 3.0f) + 3.8f * gs(x, yq + 861.6f, 9.0f, 2.8f);
    z -= 2.6f * gs(x, yq + 864.2f, 13.0f, 0.9f) + 1.6f * gs(x, yy + 854.5f, 10, 2.2f) + 1.4f * (gs(x - 12.8f, yy + 865.6f, 2.6f, 2.6f) + gs(x + 12.8f, yy + 865.6f, 2.6f, 2.6f));
    z += 4.5f * gs(x, yy + 849, 15, 8);
    return z;
}
static inline float govdeSdf(float x, float y) {
    float a = uElips(x, y, 0, -742, 80, 76), b = uElips(x, y, 0, -662, 58, 46), c = uKap(x, y, -74, -794, 74, -794, 30, 30);
    return ymin(ymin(a, b, 26), c, 22);
}
static inline float etekSdf(float x, float y) { static const float et[4][2] = {{-60, -644}, {60, -644}, {154, -452}, {-154, -452}}; return uCokgen(et, 4, x, y); }

static void kol3(V3 sh, V3 el, float yon, bool jeton, bool plakE = false) {
    const R kirmizi = rgb(206, 42, 48), turG = rgb(16, 112, 126), krem = rgb(246, 238, 222), eldiven = rgb(40, 28, 44), ten = rgb(252, 228, 214);
    const float L = 140; V3 d = el - sh; float dm = boyu(d); if (dm > 2 * L - 1) dm = 2 * L - 1; V3 dn = birim(d);
    V3 kutup{yon * 0.75f, 0.1f, -0.65f}; V3 dik = birim(kutup - dn * nokta(kutup, dn));
    V3 dir = sh + dn * (dm * 0.5f) + dik * std::sqrt(L * L - dm * dm * 0.25f);
    { V3 c[3] = {sh, (sh + dir) * 0.5f, dir}; float r[3] = {30, 33, 35};
      tup(c, r, 3, [&](V3 p, V3 n) { float e = 0.5f; float hx = (deri(p.x + e, p.y) - deri(p.x - e, p.y)), hy = (deri(p.x, p.y + e) - deri(p.x, p.y - e));
          return isik(birim(V3{n.x - hx * 0.9f, n.y - hy * 0.9f, n.z}), kirmizi, 0.28f); }); }
    { V3 u = el - dir; float um = nokta(u, u); V3 c[4] = {dir, dir + u * 0.36f, dir + u * 0.8f, el}; float r[4] = {31, 26, 20, 18};
      tup(c, r, 4, [&](V3 p, V3 n) { float v = nokta(p - dir, u) / um; R a = v < 0.36f ? turG : (v < 0.42f || (v > 0.80f && v < 0.86f)) ? altin(0.62f) : v < 0.80f ? krem : eldiven; return isik(n, a, v < 0.36f ? 0.1f : 0.25f); }); }
    V3 ud = birim(el - dir);
    elipsoid(el + ud * 3, V3{14, 14, 14}, [&](V3, V3 n) { return isik(n, eldiven, 0.1f); });
    { V3 yan = birim(capraz(ud, V3{0, 0, 1})); if (boyu(capraz(ud, V3{0, 0, 1})) < 0.2f) yan = V3{1, 0, 0}; V3 ic = capraz(ud, yan);
      auto tenSh = [&](V3, V3 n) { return isikTen(n, ten); };
      { V3 c[3] = {el + ud * 8, el + ud * 20, el + ud * 34}; float r[3] = {14, 18.5f, 16.5f}; tup(c, r, 3, tenSh); }
      for (int f = 0; f < 4; f++) { float o = (f - 1.5f) * 7.8f, boy = f == 1 ? 36.f : f == 2 ? 34.f : f == 0 ? 30.f : 25.f;
          V3 b0 = el + ud * 32 + yan * o, c[3] = {b0, b0 + ud * (boy * 0.55f) + ic * 2, b0 + ud * boy + ic * 8}; float r[3] = {5.6f, 5.0f, 4.0f}; tup(c, r, 3, tenSh); }
      { V3 b0 = el + ud * 15 + yan * (-yon * 14), c[3] = {b0, b0 + ud * 12 + yan * (-yon * 8), b0 + ud * 25 + yan * (-yon * 9.5f) + ic * 4}; float r[3] = {6.4f, 5.4f, 4.1f}; tup(c, r, 3, tenSh); } }
    if (jeton) elipsoid(el + ud * 46 + V3{0, -6, 12}, V3{18, 18, 4}, [&](V3, V3 n) { return isik(n, altin(0.74f), 0.9f); });
    if (plakE) { V3 pm = el + ud * 44 + V3{0, -16, 10}; elipsoid(pm, V3{46, 46, 3.5f}, [&](V3 p, V3 n) { float m = boyu(V3{p.x - pm.x, p.y - pm.y, 0}); R a = m < 15 ? plakYeni : (std::fabs(kes(m * 0.22f) - 0.5f) < 0.2f ? rgb(52, 46, 60) : rgb(24, 20, 30)); return isik(n, a, 0.5f); }); }
}

#ifdef PROF
static std::chrono::steady_clock::time_point profT;
#define PROFA(ad) { auto n_ = std::chrono::steady_clock::now(); printf("  %-12s %.1f ms\n", ad, std::chrono::duration<double, std::milli>(n_ - profT).count()); profT = n_; }
#define PROFB() profT = std::chrono::steady_clock::now(); printf("ciz3B hafif=%d ss=%d %dx%d\n", (int)sacHafif, kSS, KW, KH);
#else
#define PROFA(ad)
#define PROFB()
#endif
static void ciz3B(const Poz& P) {
    PROFB()
    const V3 omzSol{-92, -786, 0}, omzSag{92, -786, 0};
    if (katman == 3) { kol3(omzSol, P.sol, -1, P.jeton, P.plak == 1); kol3(omzSag, P.sag, 1, false, P.plak == 2); return; }
    const R tenR = rgb(252, 228, 214), kirmizi = rgb(206, 42, 48), krem = rgb(246, 238, 222), tur = rgb(40, 176, 186), turG = rgb(16, 112, 126), sacK = rgb(150, 132, 112);

    if (katman != 5) elipsoid(V3{0, -770, -46}, V3{96, 235, 32}, [&](V3 p, V3 n) {
        float dalga = 5 * std::sin(p.y * 0.055f) + 3 * std::sin(p.y * 0.13f + p.x * 0.05f); int si = (int)std::floor((p.x + dalga + 300) * 0.85f);
        float h = sac(si * 7 + 3), g = sac(si * 13 + 1 + (int)std::floor(p.y * 0.02f + h * 9));
        return isik(n, kar(rgb(132, 116, 98), rgb(216, 204, 186), 0.25f + 0.55f * h + 0.20f * g), 0.12f); });

    if (katman != 4) for (int kk = 0; kk < 2; kk++) {
        float k = kk == 0 ? -1.f : 1.f, ph = P.faz + (kk ? PI : 0), cs = std::cos(ph), fz = 70 * std::sin(ph) * P.amp, kalk = 38 * (cs > 0 ? cs : 0) * P.amp;
        const float La = 260.5f, Lb = 215.5f;
        V3 kal{k * 36, -560, 0}, hedef{k * 40, -85 - P.cok - kalk, fz}, d = hedef - kal; float dm = boyu(d); if (dm > La + Lb - 0.5f) dm = La + Lb - 0.5f;
        V3 dn = birim(d), bil = kal + dn * dm; float a = (La * La - Lb * Lb + dm * dm) / (2 * dm), h2 = La * La - a * a, h = h2 > 0 ? std::sqrt(h2) : 0;
        V3 on{0, 0, 1}, dik = birim(on - dn * nokta(on, dn)), diz = kal + dn * a + dik * h, e1 = diz - kal, e2 = bil - diz, o = bil - V3{k * 40, -85, 0};
        float e1k = nokta(e1, e1), e2k = nokta(e2, e2);
        { V3 c[7] = {kal, kal + e1 * 0.346f, kal + e1 * 0.692f, diz, diz + e2 * 0.395f, diz + e2 * 0.744f, bil}; float r[7] = {46, 42, 36, 31, 32, 25, 20};
          tup(c, r, 7, [&](V3 p, V3 n) { float w = nokta(p - diz, e2) / e2k, ry = w > 0 ? -300 + w * 215 : -560 + nokta(p - kal, e1) / e1k * 260;
              R yd = ry < -384 ? tenR : krem; R a2 = kapla(V3{p.x, ry, p.z}, n, yd); return ry < -384 ? isikTen(n, a2) : isik(n, a2, 0.06f); }); }
        auto botSh = [&](V3 p, V3 n) { p = p - o; R a2 = kirmizi; if (p.y > -9) a2 = rgb(252, 250, 246); else if (p.z > 44) a2 = rgb(250, 246, 240); else if (p.z < -8 && p.y > -58) a2 = tur; else if (std::fabs(p.y + 64) < 5) a2 = tur; return isik(n, a2, 0.35f); };
        { V3 c[3] = {V3{k * 40, -118, 0} + o, V3{k * 40, -70, 0} + o, V3{k * 40, -30, 0} + o}; float r[3] = {25, 26, 27}; tup(c, r, 3, botSh); }
        { V3 c[3] = {V3{k * 40, -27, -14} + o, V3{k * 42, -22, 28} + o, V3{k * 44, -16, 62} + o}; float r[3] = {26, 24, 16}; tup(c, r, 3, botSh); }
        { V3 c[2] = {V3{k * 40, -128, 0} + o, V3{k * 40, -112, 0} + o}; float r[2] = {30, 31}; tup(c, r, 2, [&](V3, V3 n) { return isik(n, rgb(250, 246, 240), 0.05f); }); }
        elipsoid(V3{k * 40, -96, 27} + o, V3{12, 7, 5}, [&](V3, V3 n) { return isik(n, altin(0.7f), 0.8f); });
    }
    if (katman == 5) { kol3(omzSol, P.sol, -1, P.jeton, P.plak == 1); kol3(omzSag, P.sag, 1, false, P.plak == 2); return; }
    PROFA("altlik+bacak")

    PROFA("etek")

    sisir(0, -722, 150, govdeSdf, 62, 0.95f, 0.80f,
          [&](float x, float y) {
              float ust = 1 - yum(-806, -738, y), bel = yum(-712, -668, y), sy = y < -728 ? 27.f : 15.f;
              return -30 * ust - 17 * bel + 13 * (gs(x - 29, y + 728, 22, sy) + gs(x + 29, y + 728, 22, sy)); },
          [&](V3 p, V3 n) {
              if (n.z < 0.02f && p.y > -678) return isik(n, (p.y > -672 && p.y < -648) ? turG : altin(0.62f), 0.4f);
              R a = kapla(p, n, kirmizi);
              if (a.r > 0.6f && a.g < 0.32f) { float e = 0.5f, hx2 = deri(p.x + e, p.y) - deri(p.x - e, p.y), hy2 = deri(p.x, p.y + e) - deri(p.x, p.y - e); n = birim(V3{n.x - hx2 * 0.9f, n.y - hy2 * 0.9f, n.z}); return isik(n, a, 0.28f); }
              if (a.r > 0.85f && a.g > 0.75f) return isikTen(n, a);
              return isik(n, a, 0.30f); });
    PROFA("govde")

    { V3 c[3] = {{0, -866, -4}, {0, -830, -3}, {0, -800, 0}}; float r[3] = {15.5f, 17, 21}; tup(c, r, 3, [&](V3 p, V3 n) { return isikTen(n, kapla(p, n, tenR)); }); }

    for (int kk = 0; kk < 2; kk++) {
        float k = kk == 0 ? -1.f : 1.f;
        for (int b = 0; b < 2; b++) {
            V3 c{k * (98 + 10 * b), -812 + 22.f * b, 4}, r = b == 0 ? V3{22, 9, 24} : V3{15, 8, 18}, dis = birim(V3{k * 0.35f, -0.9f, 0.25f});
            elipsoid(c, r, [&](V3, V3 n) { float d = nokta(n, dis); R a = d > 0.90f ? tur : d > 0.72f ? turG : d > 0.55f ? krem : d > 0.42f ? altin(0.66f) : krem; return isik(n, a, 0.5f); });
        }
        V3 c[2] = {{k * 116, -786, 6}, {k * 122, -768, 8}}; float r[2] = {4.5f, 1}; tup(c, r, 2, [&](V3, V3 n) { return isik(n, altin(0.7f), 0.8f); });
    }
    PROFA("boyun+omuz")

    PROFA("kollar")

    sisir(0, -918, 95, yuzSdf, 46, 1.25f, 1.55f, yuzOzellik, [&](V3 p, V3 n) { return isikTen(n, kapla(p, n, tenR)); });

    elipsoid(V3{0, -946, -10}, V3{67, 61, 72}, [&](V3 p, V3 n) { if (p.z > 0 && p.y > -966 + p.x * p.x * 0.010f) return R{0, 0, 0, 0}; return isik(n, sacK, 0.0f); });
    PROFA("bas+taban")

    {
        auto pili = [&](float x, float y) { float k = kis((y + 644) / 192, 0, 1); return 3.2f * std::sin(x / (60 + 94 * k) * 7.5f * 2 * PI) * k; };
        auto piliRenk = [&](V3 p) { float k = kis((p.y + 644) / 192, 0, 1), st = std::sin(p.x / (60 + 94 * k) * 7.5f * 2 * PI);
            R b = kar(rgb(170, 204, 210), rgb(224, 242, 244), 0.5f + 0.5f * st); if (p.y > -468) b = p.y > -460 ? rgb(40, 176, 186) : altin(0.7f); return b; };
        sisirArkaEk = true;
        if (katman == 2) {   }
        else if (katman == 1) {
            std::swap(KB, KE);
            sisir(0, -548, 190, etekSdf, 40, 1.45f, 1.35f, pili, [&](V3 p, V3 n) { return isik(n, piliRenk(p), 0.10f); });
            std::swap(KB, KE); std::swap(KB, KF);
            sisir(0, -548, 190, etekSdf, 40, 1.55f, 1.35f, pili, [&](V3 p, V3 n) {
                R tx; if (n.z < 0.22f || !dokuAl(p.x, p.y, tx)) return R{0, 0, 0, 0};
                bool parca = tx.r > tx.g + 0.18f || tx.r > tx.b + 0.18f || tx.b - tx.r > 0.36f || (tx.r > 0.95f && tx.g > 0.95f);
                if (!parca) return R{0, 0, 0, 0};
                return isik(n, tx, 0.18f); });
            std::swap(KB, KF);
        } else
            sisir(0, -548, 190, etekSdf, 40, 1.45f, 1.35f, pili, [&](V3 p, V3 n) { return isik(n, kapla(p, n, piliRenk(p)), 0.10f); });
        sisirArkaEk = false;
    }
    if (katman == 2) return;
    if (katman == 1) { std::memcpy(ZB0, ZB, (size_t)KW * KH * sizeof(float)); std::swap(KB, KA); }
    if (katman != 4) { kol3(omzSol, P.sol, -1, P.jeton, P.plak == 1); kol3(omzSag, P.sag, 1, false, P.plak == 2); }
    if (katman == 1) std::swap(KB, KA);
    if (katman == 1) std::swap(KB, KS);

    for (int j = 0; j < 70; j++) {
        float sg = j % 2 ? 1.f : -1.f, r = sac(j * 41 + 7), fi = sg * (12 + 168 * r) * PI / 180, sf = std::sin(fi), cf = std::cos(fi);
        V3 e2{cf, 0, -sf}, e1{sf, 0, cf}; float z0 = 26 - 80 * r;
        Demet3 D{{sg * 2, -1007, z0}, {sf * 44, -1012, z0 * 0.6f + cf * 30 - 4}, {sf * 70, -985, cf * 72 - 10}, {sf * 72, -930 + 12 * sac(j * 5 + 2), cf * 76 - 10},
                 e1, e2, 26, 15, 1.4f, 1.0f, 0.5f, 0.06f, j + 300, 0.5f, 44};
        demet3(D);
    }
    for (int j = 0; j < 96; j++) {
        float sg = j % 2 ? 1.f : -1.f, r = sac(j * 37 + 11), fi = sg * (58 + 122 * r) * PI / 180, sf = std::sin(fi), cf = std::cos(fi);
        V3 e2{cf, 0, -sf}, e1{sf, 0, cf}; float rb = 74 + 36 * sac(j * 3 + 2), z0 = 10 - 70 * r;
        Demet3 D{{sf * 60, -975, cf * 62 - 8 + z0 * 0.1f}, {sf * 84, -930, cf * 80 - 10}, {sf * 86, -780, cf * 78 - 16}, {sf * rb, -520 - 80 * sac(j * 9 + 4), cf * rb * 0.85f - 22},
                 e1, e2, 22, 11, 7.5f + 4 * sac(j * 5 + 3), 8.0f + 4.0f * sac(j * 9 + 4), 0.02f, 0.20f * r, j + 100, 0.45f, 120};
        demet3(D);
    }
    for (int kk = 0; kk < 2; kk++) for (int j = 0; j < 4; j++) {
        float sg = kk == 0 ? -1.f : 1.f; int t = kk * 10 + j; float fi = sg * (44 + 6 * j) * PI / 180, sf = std::sin(fi), cf = std::cos(fi);
        V3 e2{cf, 0, -sf}, e1{sf, 0, cf};
        Demet3 D{{sf * 64, -952, cf * 66 - 8}, {sf * 84, -905, cf * 84 - 6}, {sf * 84, -780, cf * 86}, {sf * (92 + 5 * j), -628 - 24 * sac(t * 3 + 1), cf * 96 + 4},
                 e1, e2, 30, 9, 8 + 3 * sac(t * 5 + 2), 9.0f + 3.0f * sac(t * 7 + 3), 0.04f, 0.04f, 500 + t, 0.45f, 120};
        demet3(D);
    }
    for (int j = 0; j < 30; j++) {
        float sg = j % 2 ? 1.f : -1.f, r = sac(j * 29 + 3), x2 = sg * (4 + 42 * r), x3 = sg * (7 + 58 * r);
        Demet3 D{{sg * 1.5f, -1006, 30}, {sg * (6 + 26 * r), -1008, 56}, {x2, -975, 70 - x2 * x2 * 0.006f}, {x3, -948 + 20 * r + 8 * sac(j * 7 + 4), 68 - x3 * x3 * 0.010f},
                 V3{0, 0, 1}, V3{1, 0, 0}, 8, 9, 6.0f, 1.6f, 0.36f, 0.0f, j + 400, 0.5f, 60};
        demet3(D);
    }
    PROFA("sac telleri")

    for (int kk = 0; kk < 2; kk++) for (int f = 0; f < 3; f++) {
        float sg = kk == 0 ? -1.f : 1.f, fi = sg * (38 + 14 * f) * PI / 180; V3 c{std::sin(fi) * 72, -992 + 13.f * f, std::cos(fi) * 76 - 8}, dis = birim(V3{std::sin(fi), -0.35f, std::cos(fi)});
        V3 a = birim(capraz(dis, V3{0, 1, 0})), b = capraz(dis, a); float rr = 7.5f - f;
        for (int q = 0; q < 5; q++) { float an = q * 2 * PI / 5; V3 pc = c + (a * std::cos(an) + b * std::sin(an)) * (rr * 0.62f);
            elipsoid(pc, V3{rr * 0.6f, rr * 0.6f, rr * 0.6f}, [&](V3, V3 n) { return isik(n, rgb(250, 208, 218), 0.15f); }); }
        elipsoid(c + dis * 2.5f, V3{rr * 0.32f, rr * 0.32f, rr * 0.32f}, [&](V3, V3 n) { return isik(n, altin(0.8f), 0.6f); });
    }
    if (katman == 1) std::swap(KB, KS);
}

static Poz kizPoz(double t) {
    const V3 tasi{-98, -692, 122}, asagi{-124, -516, 18};
    Poz P{kizX, 0, 0, 0, 0, asagi, V3{124, -516, 18}, false, false};
    bool evde = kizX < 500;
    if (jetonBas < 0) { if (evde) { P.sol = tasi; P.jeton = true; } else P.yaw = 20; return P; }
    float u = (float)(t - jetonBas); P.hareket = true;
    if (kizIs == 2) {
        const float HX = 1212, PX = 806, a1 = pd1, a2 = a1 + 0.5f, a3 = a2 + 0.45f, a4 = a3 + 2.2f, a5 = a4 + 0.45f, a6 = a5 + 0.6f, a7 = a6 + 0.4f, a8 = a7 + 1.1f, a9 = a8 + 0.45f;
        const V3 tasiSol{-98, -700, 118}, tasiSag{98, -700, 118};
        auto hedef = [&](float aci, float X, float Y, float Z) { float c = std::cos(aci * PI / 180), sn = std::sin(aci * PI / 180); return V3{X * c - Z * sn, Y, X * sn + Z * c}; };
        V3 bosluk = hedef(62, (1281 - HX) / KOL - 52, (424 - KGY) / KOL, 40), tabla = hedef(40, (887 - PX) / KOL - 46, (396 - KGY) / KOL, 30);
        auto yuru = [&](float x0, float x1, float s, float yon) { P.x = kar(x0, x1, s); P.yon = yon; P.faz = std::fabs(P.x - x0) / KOL / 280 * 2 * PI; P.amp = kis((s < 1 - s ? s : 1 - s) * 8, 0, 1);
            float sn = std::sin(P.faz); P.cok = P.amp * (6 + 6 * sn * sn); return sn * P.amp; };
        float y0 = kizBasX < 500 ? 0.f : 20.f;
        if (u < a1) { float sal = yuru(kizBasX, HX, kis((u - 0.15f) / (a1 - 0.3f), 0, 1), 1); P.yaw = kar(y0, 62, yum(0, 0.35f, u)); P.sag.z = 18 + 55 * sal; P.sol.z = 18 - 55 * sal; }
        else if (u < a2) { P.x = HX; P.yaw = 62; P.sol = asagi + (bosluk - asagi) * yum(a1, a2 - 0.05f, u); }
        else if (u < a3) { P.x = HX; float k = yum(a2, a3, u); P.yaw = kar(62, -58, k); P.sol = bosluk + (tasiSol - bosluk) * yum(a2, a2 + 0.3f, u); P.plak = 1; if (k > 0.5f) { P.plak = 2; P.sag = tasiSag; P.sol = asagi; } }
        else if (u < a4) { float sal = yuru(HX, PX, kis((u - a3) / (a4 - a3), 0, 1), -1); P.yaw = -58; P.sag = tasiSag; P.plak = 2; P.sol.z = 18 - 55 * sal; }
        else if (u < a5) { P.x = PX; float k = yum(a4, a5, u); P.yaw = kar(-58, 40, k); if (k < 0.5f) { P.sag = tasiSag; P.plak = 2; } else { P.sol = tasiSol; P.plak = 1; } }
        else if (u < a6) { P.x = PX; P.yaw = 40; P.sol = tasiSol + (tabla - tasiSol) * yum(a5, a6 - 0.05f, u); P.plak = 1; }
        else if (u < a7) { P.x = PX; P.yaw = kar(40, -58, yum(a6 + 0.1f, a7, u)); P.sol = tabla + (asagi - tabla) * yum(a6, a7, u); }
        else if (u < a8) { float sal = yuru(PX, KIZDUR, kis((u - a7) / (a8 - a7), 0, 1), -1); P.yaw = -58; P.sag.z = 18 + 55 * sal; P.sol.z = 18 - 55 * sal; }
        else { P.x = KIZDUR; P.yaw = kar(-58, 20, yum(a8, a9, u)); }
        return P;
    }
    bool yuruyor = yurSure > 0.4f; float y0 = kizBasX < 500 ? 0.f : 20.f;
    float s = yuruyor ? kis((u - 0.15f) / (yurSure - 0.3f), 0, 1) : 1;
    P.x = kar(kizBasX, KIZHEDEF, s); P.yaw = kar(y0, 62, yum(0, 0.35f, u));
    if (yuruyor) {
        P.faz = (P.x - kizBasX) / KOL / 280 * 2 * PI; P.amp = kis((s < 1 - s ? s : 1 - s) * 8, 0, 1);
        float sn = std::sin(P.faz); P.cok = P.amp * (6 + 6 * sn * sn); P.sag.z = 18 + 55 * sn * P.amp;
    }
    float c80 = std::cos(62 * PI / 180), s80 = std::sin(62 * PI / 180), X = (YX - KIZHEDEF) / KOL - 52, Y = (YY - KGY) / KOL, Z = 70;
    V3 yuva{X * c80 - Z * s80, Y, X * s80 + Z * c80};
    float tk = yurSure + 0.55f;
    if (u < tk) { float k = yum(yurSure, yurSure + 0.5f, u); P.sol = tasi + (yuva - tasi) * k; P.jeton = true; }
    else {
        float k = yum(tk, tk + 0.5f, u); P.sol = yuva + (asagi - yuva) * k;
        float g = kis((u - tk - 0.45f) / 1.1f, 0, 1); P.x = kar(KIZHEDEF, KIZDUR, g); P.yon = -1;
        P.yaw = u < tk + 1.5f ? kar(62, -58, yum(tk + 0.1f, tk + 0.6f, u)) : kar(-58, 20, yum(tk + 1.5f, tk + 1.95f, u));
        P.faz = (KIZHEDEF - P.x) / KOL / 280 * 2 * PI; P.amp = kis((g < 1 - g ? g : 1 - g) * 8, 0, 1);
        float sn = std::sin(P.faz); P.cok = P.amp * (6 + 6 * sn * sn); P.sag.z = 18 + 55 * sn * P.amp; P.sol.z += -55 * sn * P.amp * k;
    }
    return P;
}

static uint8_t* IB = nullptr; static int ibSig = 0; static bool ibHazir = false;
static float *JX = nullptr, *JY = nullptr; static int jxSig = 0, jySig = 0;
static const float JO_PER = 6.4f, JO_AT = 0.40f, JO_TUT = 1.32f;
static V3 jetonElde(V3 sh, V3 el, float yon) {
    const float L = 140; V3 d = el - sh; float dm = boyu(d); if (dm > 2 * L - 1) dm = 2 * L - 1; V3 dn = birim(d);
    V3 kutup{yon * 0.75f, 0.1f, -0.65f}; V3 dik = birim(kutup - dn * nokta(kutup, dn)); V3 dir = sh + dn * (dm * 0.5f) + dik * std::sqrt(L * L - dm * dm * 0.25f);
    return el + birim(el - dir) * 46 + V3{0, -6, 12};
}
static float joEl(float u) {
    if (u < 0.30f) return 22 * yum(0, 0.30f, u);
    if (u < 0.44f) return kar(22, -26, yum(0.30f, 0.44f, u));
    if (u < JO_TUT) return kar(-26, -8, yum(0.44f, JO_TUT, u));
    if (u < JO_TUT + 0.16f) return kar(-8, 14, yum(JO_TUT, JO_TUT + 0.16f, u));
    return kar(14, 0, yum(JO_TUT + 0.16f, JO_TUT + 0.6f, u));
}

static uint8_t *MB = nullptr, *HC[4] = {}; static float *MZ = nullptr, *HZ[4] = {}; static int mSig = 0; static bool hGec[4] = {};
static float hS = -1, hYaw = -999, hSonYaw = -999;
static void hareketCiz(const Poz& P, float yaw) {
    int mw = (int)std::ceil(650 * S) + 2, mh = (int)std::ceil(1099 * S) + 2;
    if (mw * mh != mSig) {
        std::free(MB); std::free(MZ); mSig = mw * mh; MB = (uint8_t*)std::malloc((size_t)mSig * 4); MZ = (float*)std::malloc((size_t)mSig * sizeof(float));
        for (int i = 0; i < 4; i++) { std::free(HC[i]); std::free(HZ[i]); HC[i] = (uint8_t*)std::malloc((size_t)mSig * 4); HZ[i] = (float*)std::malloc((size_t)mSig * sizeof(float)); hGec[i] = false; }
    }
    if (S != hS || yaw != hYaw) { for (int i = 0; i < 4; i++) hGec[i] = false; hS = S; hYaw = yaw; }
    bool sabit = yaw == hSonYaw; hSonYaw = yaw;
    float fx = 300 * S + 0.5f, fy = 1075 * S + 0.5f; int sx0 = (int)std::lround(OX - fx), sy0 = (int)std::lround(OY - fy);
    uint8_t* eKB = KB; float* eZB = ZB; int eKW = KW, eKH = KH;
    KW = mw; KH = mh; kS = S; kOX = fx; kOY = fy; cY = std::cos(yaw * PI / 180); sY = std::sin(yaw * PI / 180); sacHafif = true;
    float b2 = std::sin(2 * P.faz); int v = P.amp < 0.05f ? 0 : (b2 > 0.33f ? 3 : b2 < -0.33f ? 1 : 2);
    float am = v == 0 ? 0.f : 1.f, zb = v == 0 ? 0.f : (v - 2) * 0.8f;
    sacKay = V3{-34 * am * P.yon * cY, 9 * zb, -34 * am * P.yon * sY};
    if (sabit) {
        if (!hGec[v]) { KB = HC[v]; ZB = HZ[v]; std::memset(KB, 0, (size_t)mSig * 4); for (int i = 0; i < mSig; i++) ZB[i] = -1e9f; katman = 4; ciz3B(P); hGec[v] = true; }
        std::memcpy(MB, HC[v], (size_t)mSig * 4); std::memcpy(MZ, HZ[v], (size_t)mSig * sizeof(float));
        KB = MB; ZB = MZ; katman = 5; ciz3B(P);
    } else {
        KB = MB; ZB = MZ; std::memset(KB, 0, (size_t)mSig * 4); for (int i = 0; i < mSig; i++) ZB[i] = -1e9f; katman = 0; ciz3B(P);
    }
    katman = 0;
    int ya = sy0 < 0 ? -sy0 : 0, yb = sy0 + mh > H ? H - sy0 : mh, xa = sx0 < 0 ? -sx0 : 0, xb = sx0 + mw > W ? W - sx0 : mw;
    for (int y = ya; y < yb; y++) {
        uint8_t* d = T + 4 * ((sy0 + y) * W + sx0 + xa); const uint8_t* q = MB + 4 * (y * mw + xa);
        for (int x = xa; x < xb; x++, d += 4, q += 4) { unsigned a = q[3]; if (!a) continue; if (a == 255) { d[0] = q[0]; d[1] = q[1]; d[2] = q[2]; continue; } unsigned ia = 255 - a;
            d[0] = (uint8_t)((d[0] * ia + q[0] * a + 127) / 255); d[1] = (uint8_t)((d[1] * ia + q[1] * a + 127) / 255); d[2] = (uint8_t)((d[2] * ia + q[2] * a + 127) / 255); }
    }
    KB = eKB; ZB = eZB; KW = eKW; KH = eKH;
}

static void kiz(double t) {
    if (!dokuHazir) {
        if (!ATX) { ATX = (uint8_t*)std::malloc((size_t)TW * TH * 4); ATX2 = (uint8_t*)std::malloc((size_t)TW * TH * 4); }
        uint8_t* eT = T; int eW = W, eH = H; float eS = S, eOX = OX, eOY = OY; bool eK = saydamKip;
        for (int g = 0; g < 2; g++) {
            uint8_t* hed = g == 0 ? ATX : ATX2; std::memset(hed, 0, (size_t)TW * TH * 4);
            T = hed; W = TW; H = TH; S = TS; OX = TXG * TS; OY = TYU * TS; saydamKip = true; kirpZor = (float)g;
            kizBoya(0);
        }
        kirpZor = -1; T = eT; W = eW; H = eH; S = eS; OX = eOX; OY = eOY; saydamKip = eK; dokuHazir = true;
    }
    Poz P = kizPoz(t); float yaw = P.yaw + donDer;
    elips(P.x, KGY - 1, 44, 5, rgb(8, 4, 20, 0.14f));
    Yer e = yerAc(P.x, KGY, KOL); OY += P.cok * S;
    if (P.hareket) { hareketCiz(P, yaw); yerKapa(e); kizTazele = true; return; }
    hSonYaw = -999;
    int x0 = (int)std::floor(-300 * S + OX), x1 = (int)std::ceil(350 * S + OX), y0 = (int)std::floor(-1075 * S + OY), y1 = (int)std::ceil(24 * S + OY);
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > W) x1 = W; if (y1 > H) y1 = H;
    if (x1 > x0 && y1 > y0) {
        bool yenile = kizTazele || P.hareket || sonAtiyor || x0 != kbx0 || y0 != kby0 || x1 - x0 != kbw || y1 - y0 != kbh || P.x != sonKizX || yaw != sonYaw;
        if (yenile) {
            sacHafif = P.hareket; kSS = P.hareket ? 1 : 2; sonKizX = P.x; sonYaw = yaw;
            kbx0 = x0; kby0 = y0; kbw = x1 - x0; kbh = y1 - y0; KW = kbw * kSS; KH = kbh * kSS;
            if (kbw * kbh * 4 > kbSig) { std::free(KB); std::free(KB2); std::free(KS); std::free(KE); std::free(KF); std::free(KA); std::free(ZB0); std::free(ZB); kbSig = kbw * kbh * 4; KB = (uint8_t*)std::malloc((size_t)kbSig * 4); KB2 = (uint8_t*)std::malloc((size_t)kbSig * 4); KS = (uint8_t*)std::malloc((size_t)kbSig * 4); KE = (uint8_t*)std::malloc((size_t)kbSig * 4); KF = (uint8_t*)std::malloc((size_t)kbSig * 4); KA = (uint8_t*)std::malloc((size_t)kbSig * 4); ZB0 = (float*)std::malloc((size_t)kbSig * sizeof(float)); ZB = (float*)std::malloc((size_t)kbSig * sizeof(float)); }
            std::memset(KB, 0, (size_t)KW * KH * 4); for (int i = 0; i < KW * KH; i++) ZB[i] = -1e9f;
            kS = S * kSS; kOX = (OX - kbx0) * kSS; kOY = (OY - kby0) * kSS; cY = std::cos(yaw * PI / 180); sY = std::sin(yaw * PI / 180);
            katman = P.hareket ? 0 : 1; if (katman) { std::memset(KS, 0, (size_t)KW * KH * 4); std::memset(KE, 0, (size_t)KW * KH * 4); std::memset(KF, 0, (size_t)KW * KH * 4); std::memset(KA, 0, (size_t)KW * KH * 4); }
            { float am = P.hareket ? P.amp : 0; sacKay = V3{-34 * am * P.yon * cY, 9 * am * std::sin(2 * P.faz), -34 * am * P.yon * sY}; }
            ciz3B(P);
            dpHazir = 0; ibHazir = false;
            kb2Var = false; kb2Bekle = !P.hareket;
            kizTazele = false; sonAtiyor = P.hareket;
        } else if (kb2Bekle) {
            std::swap(KB, KB2); std::swap(ATX, ATX2);
            std::memset(KB, 0, (size_t)KW * KH * 4); for (int i = 0; i < KW * KH; i++) ZB[i] = -1e9f;
            katman = 2; ciz3B(P); katman = 1;
            std::swap(KB, KB2); std::swap(ATX, ATX2);
            kb2Var = true; kb2Bekle = false;
        } else if (!P.hareket && kizX < 500 && jetonBas < 0 && !ibHazir && (size_t)KW * KH * 4 <= 8000000u) {
            if (ibSig != KW * KH) { std::free(IB); IB = (uint8_t*)std::malloc((size_t)KW * KH * 4); ibSig = KW * KH; }
            Poz Q = P; Q.jeton = false;
            std::swap(KB, IB); std::memset(KB, 0, (size_t)KW * KH * 4); std::memcpy(ZB, ZB0, (size_t)KW * KH * sizeof(float));
            katman = 3; ciz3B(Q); katman = 1; std::swap(KB, IB); ibHazir = true;
        } else if (!P.hareket && kizX > 500 && calGuc > 0.25f && hava != 1 && dpHazir < DANS && (size_t)KW * KH * 4 <= 5000000u) {

            if (dpSig != KW * KH) { for (int i = 0; i < DANS; i++) { std::free(DP[i]); DP[i] = (uint8_t*)std::malloc((size_t)KW * KH * 4); } dpSig = KW * KH; }
            float f = dpHazir * 2 * PI / DANS, sn = std::sin(f), cs = std::cos(f); Poz Q = P;

            Q.sol = V3{-82 - 20 * sn, -728 - 50 * cs, 110}; Q.sag = V3{82 - 20 * sn, -728 + 50 * cs, 110};
            Q.jeton = false;
            std::swap(KB, DP[dpHazir]);
            std::memset(KB, 0, (size_t)KW * KH * 4); std::memcpy(ZB, ZB0, (size_t)KW * KH * sizeof(float));
            katman = 3; ciz3B(Q); katman = 1;
            std::swap(KB, DP[dpHazir]); dpHazir++;
        }
        float kf = (float)std::fmod(t + 1.3, 4.2); const uint8_t* KK = (kb2Var && !P.hareket && kf < (hava == 1 && calGuc > 0.5f ? 0.95f : 0.13f)) ? KB2 : KB; const uint8_t* KAk = KA;
        bool dansKol = false;
        if (!P.hareket && kSS == 2 && dpHazir == DANS && dpSig == KW * KH && calGuc > 0.5f && kizX > 500 && hava != 1) { float f = (float)std::fmod(ritimFaz * 0.5f, 2 * PI) / (2 * PI) * DANS; KAk = DP[(int)f % DANS]; dansKol = true; }
        const bool oyun = !P.hareket && kSS == 2 && kizX < 500 && jetonBas < 0 && kizIs == 0 && calGuc < 0.05f && ibHazir && ibSig == KW * KH;
        const float ou = oyun ? (float)std::fmod(t + 2.0, (double)JO_PER) : 99, elDy = oyun ? joEl(ou) : 0; const bool havada = oyun && ou >= JO_AT && ou < JO_TUT;
        if (havada) KAk = IB;
        V3 jE{0, 0, 0}; if (oyun) jE = jetonElde(V3{-92, -786, 0}, P.sol, -1);
        if (kSS == 1) {
            for (int y = 0; y < kbh; y++) { uint8_t* d = T + 4 * ((kby0 + y) * W + kbx0); const uint8_t* s0 = KK + 4 * (y * KW);
                for (int x = 0; x < kbw; x++, d += 4, s0 += 4) { unsigned a = s0[3]; if (!a) continue; unsigned ia = 255 - a;
                    d[0] = (uint8_t)((d[0] * ia + s0[0] * a + 127) / 255); d[1] = (uint8_t)((d[1] * ia + s0[1] * a + 127) / 255); d[2] = (uint8_t)((d[2] * ia + s0[2] * a + 127) / 255); } }
        } else {

            const int KAT = 4, SAT = 5;
            int gerek = kbh * (KAT * SAT + 1) + kbw * 4; if (gerek > salSig) { std::free(salDizi); salSig = gerek; salDizi = (float*)std::malloc(sizeof(float) * salSig); }
            float *R0 = salDizi, *rAw = R0 + kbh * KAT * SAT, *cS = rAw + kbh, *cC = cS + kbw, *cLx = cC + kbw, *cT = cLx + kbw;
            auto sat = [&](int kat, int hangi) { return R0 + (kat * SAT + hangi) * kbh; };
            float tt = (float)t, cal = calGuc, is = 1 / S, dur = 1 - cal, rf = ritimFaz, rs = rf * (hava == 1 ? 0.25f : 0.5f), zk = hava == 1 ? 0.22f : hava == 2 ? 1.35f : 1.f, sk = hava == 1 ? 1.5f : hava == 2 ? 1.15f : 1.f;

            float sal = dur * (7 * std::sin(0.8f * tt) + 3 * std::sin(0.31f * tt + 1.3f)) + 10 * sk * cal * std::sin(rs), zip = 7 * zk * cal * (0.5f + 0.5f * std::cos(rf));
            float aci = dur * (0.03f * std::sin(0.9f * tt + 0.6f) + 0.012f * std::sin(0.37f * tt)) + 0.045f * cal * std::sin(rs + 0.6f), sA = std::sin(2.7f * tt), cA = std::cos(2.7f * tt);
            float diz = 1.6f * dur * std::sin(0.8f * tt + 1.0f) + 5.5f * cal * std::sin(rs);

            float eSal = 7 * dur * std::sin(0.8f * tt - 1.0f) + 17 * cal * std::sin(rs - 1.0f), eAc = 0.014f * dur * std::sin(0.6f * tt) + 0.055f * cal * (0.5f - 0.5f * std::cos(rf - 0.6f)), eKalk = 2.2f * cal * std::sin(rf - 0.8f);
            float fSal = 9 * dur * std::sin(0.8f * tt - 1.7f) + 23 * cal * std::sin(rs - 1.7f), fAc = 0.022f * dur * std::sin(0.6f * tt - 0.5f) + 0.080f * cal * (0.5f - 0.5f * std::cos(rf - 1.1f)), fKalk = 4.0f * cal * (0.5f - 0.5f * std::cos(rf - 1.2f));
            for (int y = 0; y < kbh; y++) {
                float ly = (kby0 + y + 0.5f - OY) * is;
                float ust = kis((-ly - 60) / 880, 0, 1), wh = kis((ly + 930) / 420, 0, 1), nb = (ly + 760) / 70, db = (ly + 300) / 130, e = kis((ly + 644) / 200, 0, 1), e15 = e * std::sqrt(e);
                float kay = sal * ust * std::sqrt(ust), dy0 = zip * kis((-ly - 100) / 420, 0, 1) - 2.2f * std::sin(1.7f * tt) * std::exp(-nb * nb), w = 1 - yum(-900, -840, ly);
                rAw[y] = aci * w;
                sat(0, 0)[y] = kay - aci * (ly + 860) * w; sat(0, 1)[y] = dy0; sat(0, 2)[y] = 0; sat(0, 3)[y] = 0; sat(0, 4)[y] = diz * std::exp(-db * db);
                sat(1, 0)[y] = kay + e15 * eSal; sat(1, 1)[y] = dy0 - e * eKalk; sat(1, 2)[y] = e * (1.5f + 2.5f * cal); sat(1, 3)[y] = e * e * eAc; sat(1, 4)[y] = 0;
                sat(2, 0)[y] = kay + e15 * fSal; sat(2, 1)[y] = dy0 - e * fKalk; sat(2, 2)[y] = e * (2.5f + 4 * cal); sat(2, 3)[y] = e * e * fAc; sat(2, 4)[y] = 0;
                sat(3, 0)[y] = kay - aci * (ly + 860) * w + wh * wh * (6 + 9 * cal) * std::sin(1.6f * tt - ly * 0.007f); sat(3, 1)[y] = dy0 + wh * (1.5f + 2 * cal) * std::sin(rs + ly * 0.01f); sat(3, 2)[y] = wh * (2.5f + 2 * cal); sat(3, 3)[y] = 0; sat(3, 4)[y] = 0;
            }
            for (int x = 0; x < kbw; x++) { float lx = (kbx0 + x + 0.5f - OX) * is; cLx[x] = lx; cS[x] = std::sin(lx * 0.035f); cC[x] = std::cos(lx * 0.035f); cT[x] = kis(lx / 18, -1, 1); }
            if (oyun) {
                if (jxSig < kbw) { std::free(JX); JX = (float*)std::malloc(sizeof(float) * kbw); jxSig = kbw; }
                if (jySig < kbh) { std::free(JY); JY = (float*)std::malloc(sizeof(float) * kbh); jySig = kbh; }
                const float ex = jE.x * cY + jE.z * sY, ey = jE.y - 20;
                for (int x = 0; x < kbw; x++) { float a = (cLx[x] - ex) / 62; JX[x] = std::exp(-a * a); }
                for (int y = 0; y < kbh; y++) { float a = ((kby0 + y + 0.5f - OY) * is - ey) / 58; JY[y] = std::exp(-a * a); }
            }
            static const int SIR_ON[5] = {0, 1, 2, 3, 4}, SIR_DANS[5] = {0, 1, 2, 4, 3};
            for (int sr = 0; sr < 5; sr++) {
                const int sira = dansKol ? SIR_DANS[sr] : SIR_ON[sr];
                int kat = sira == 3 ? 0 : sira == 4 ? 3 : sira; const uint8_t* src = sira == 0 ? KK : sira == 1 ? KE : sira == 2 ? KF : sira == 3 ? KAk : KS; bool bas = kat == 0 || kat == 3;
                const bool elBuk = oyun && sira == 3 && elDy != 0;
                const float *pbx = sat(kat, 0), *pby = sat(kat, 1), *phw = sat(kat, 2), *pfl = sat(kat, 3), *pkn = sat(kat, 4);
                for (int y = 0; y < kbh; y++) {
                    uint8_t* d = T + 4 * ((kby0 + y) * W + kbx0);
                    float bx = pbx[y], by = pby[y], hw = phw[y], fl = pfl[y], kn = pkn[y], aw = bas ? rAw[y] : 0, jy = elBuk ? elDy * JY[y] : 0;
                    for (int x = 0; x < kbw; x++, d += 4) {
                        float dx = bx + hw * (sA * cC[x] + cA * cS[x]) + fl * cLx[x] + kn * cT[x], dy = by + aw * cLx[x] + (jy != 0 ? jy * JX[x] : 0);
                        float fx = (x + 0.5f - dx * S) * 2 - 0.5f, fy = (y + 0.5f - dy * S) * 2 - 0.5f;
                        int ix = (int)fx, iy = (int)fy; if (fx < 0 || fy < 0 || ix >= KW - 1 || iy >= KH - 1) continue;
                        const uint8_t* q = src + 4 * (iy * KW + ix); const uint8_t* q2 = q + 4 * KW;
                        if (!(q[3] | q[7] | q2[3] | q2[7])) continue;
                        float ax = fx - ix, ay = fy - iy, w0 = (1 - ax) * (1 - ay) * q[3], w1 = ax * (1 - ay) * q[7], w2 = (1 - ax) * ay * q2[3], w3 = ax * ay * q2[7], a = w0 + w1 + w2 + w3;
                        if (a < 1) continue;
                        float ia = 1 - a * (1 / 255.f), k255 = 1 / 255.f;
                        d[0] = (uint8_t)(d[0] * ia + (q[0] * w0 + q[4] * w1 + q2[0] * w2 + q2[4] * w3) * k255 + 0.5f);
                        d[1] = (uint8_t)(d[1] * ia + (q[1] * w0 + q[5] * w1 + q2[1] * w2 + q2[5] * w3) * k255 + 0.5f);
                        d[2] = (uint8_t)(d[2] * ia + (q[2] * w0 + q[6] * w1 + q2[2] * w2 + q2[6] * w3) * k255 + 0.5f);
                    }
                }
            }
            if (havada) {
                const float s = (ou - JO_AT) / (JO_TUT - JO_AT), ex = jE.x * cY + jE.z * sY;
                const float y0 = jE.y + joEl(JO_AT), y1 = jE.y + joEl(JO_TUT), jy = kar(y0, y1, s) - 230 * 4 * s * (1 - s), jx = ex + 10 * std::sin(s * PI);
                const float ust = kis((-jy - 60) / 880, 0, 1), kay = sal * ust * std::sqrt(ust) - aci * (jy + 860);
                const float gen = std::fabs(std::cos(s * 3.5f * 2 * PI)), cx0 = jx + kay;
                elips(cx0, jy, 19 * gen + 2.6f, 19, altin(0.32f));
                if (gen > 0.2f) elips(cx0, jy, 19 * gen - 1.2f, 17.4f, altin(0.62f + 0.3f * gen));
                if (gen > 0.55f) elips(cx0 - 5 * gen, jy - 5, 6 * gen, 4.5f, altin(0.95f));
            }
        }
    }
    yerKapa(e);
}
