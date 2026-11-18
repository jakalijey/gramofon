#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <utility>

#define YENI_USLUP 1

#define YENI_SALON 1

namespace gr {

struct R { float r, g, b, a; };
static inline R rgb(int r, int g, int b, float a = 1) { return {r / 255.f, g / 255.f, b / 255.f, a}; }
static inline float kis(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }
static inline float kar(float a, float b, float t) { return a + (b - a) * t; }
static inline R kar(R a, R b, float t) { return {kar(a.r, b.r, t), kar(a.g, b.g, t), kar(a.b, b.b, t), kar(a.a, b.a, t)}; }
static inline float yum(float a, float b, float v) { float t = kis((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
static inline float kes(float v) { return v - std::floor(v); }
static inline float sac(int n) { n = (n << 13) ^ n; unsigned u = (unsigned)n * ((unsigned)n * (unsigned)n * 15731u + 789221u) + 1376312589u; return (u & 0x7fffffff) / 2147483648.f; }
static const float PI = 3.14159265f;
static inline float uz(float x, float y) { return std::sqrt(x * x + y * y); }

static const R KEHRIBAR = rgb(217, 119, 6), TURKUAZ = rgb(13, 148, 136), YESIL = rgb(22, 163, 74), MENEKSE = rgb(124, 58, 237);

static uint8_t* T = nullptr;
static int W = 0, H = 0;
static float S = 1, OX = 0, OY = 0;

static uint8_t *CIK = nullptr, *A = nullptr, *B = nullptr;
static uint8_t *P = nullptr; static int pOnbellek = -1, pKutu[4] = {0, 0, 0, 0};
static bool tazele = true, saydamKip = false;

static inline void kat(int px, int py, R c, float a) {
    a *= c.a; if (a <= 0.003f) return; if (a > 1) a = 1;
    uint8_t* p = T + 4 * (py * W + px); float ia = 1 - a;
    if (saydamKip) {
        p[0] = (uint8_t)(p[0] * ia + kis(c.r, 0, 1) * 255 * a + 0.5f);
        p[1] = (uint8_t)(p[1] * ia + kis(c.g, 0, 1) * 255 * a + 0.5f);
        p[2] = (uint8_t)(p[2] * ia + kis(c.b, 0, 1) * 255 * a + 0.5f);
        p[3] = (uint8_t)(p[3] * ia + 255 * a + 0.5f);
        return;
    }
    p[0] = (uint8_t)(p[0] * ia + kis(c.r, 0, 1) * 255 * a + 0.5f);
    p[1] = (uint8_t)(p[1] * ia + kis(c.g, 0, 1) * 255 * a + 0.5f);
    p[2] = (uint8_t)(p[2] * ia + kis(c.b, 0, 1) * 255 * a + 0.5f);
    p[3] = 255;
}

template <class Sd, class Cl>
static void sekil(float x0, float y0, float x1, float y1, Sd sdf, Cl renk) {
    int ax = (int)std::floor(x0 * S + OX) - 1, ay = (int)std::floor(y0 * S + OY) - 1;
    int bx = (int)std::ceil(x1 * S + OX) + 1, by = (int)std::ceil(y1 * S + OY) + 1;
    if (ax < 0) ax = 0; if (ay < 0) ay = 0; if (bx > W) bx = W; if (by > H) by = H;
    float is = 1 / S;
    for (int py = ay; py < by; py++) {
        float vy = (py + 0.5f - OY) * is;
        for (int px = ax; px < bx; px++) {
            float vx = (px + 0.5f - OX) * is;
            float d = sdf(vx, vy);
            float a = 0.5f - d * S;
            if (a <= 0) continue;
            if (a > 1) a = 1;
            kat(px, py, renk(vx, vy, d), a);
        }
    }
}

static inline float uDaire(float x, float y, float cx, float cy, float r) { return uz(x - cx, y - cy) - r; }
static inline float uElips(float x, float y, float cx, float cy, float rx, float ry) {
    float px = x - cx, py = y - cy;
    float k0 = uz(px / rx, py / ry), k1 = uz(px / (rx * rx), py / (ry * ry));
    return k1 > 1e-9f ? k0 * (k0 - 1) / k1 : -(rx < ry ? rx : ry);
}
static inline float uKutu(float x, float y, float cx, float cy, float hx, float hy, float r) {
    float qx = std::fabs(x - cx) - hx + r, qy = std::fabs(y - cy) - hy + r;
    float mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
    float ic = qx > qy ? qx : qy;
    return uz(mx, my) + (ic < 0 ? ic : 0) - r;
}
static inline float uKap(float x, float y, float ax, float ay, float bx, float by, float ra, float rb, float* hc = nullptr) {
    float ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
    float h = kis((wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-9f), 0, 1);
    if (hc) *hc = h;
    return uz(wx - ex * h, wy - ey * h) - kar(ra, rb, h);
}
static float uCokgen(const float (*v)[2], int n, float x, float y) {
    float d = (x - v[0][0]) * (x - v[0][0]) + (y - v[0][1]) * (y - v[0][1]); float s = 1;
    for (int i = 0, j = n - 1; i < n; j = i, i++) {
        float ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], wx = x - v[i][0], wy = y - v[i][1];
        float h = kis((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
        float bx = wx - ex * h, by = wy - ey * h, dd = bx * bx + by * by; if (dd < d) d = dd;
        bool c1 = y >= v[i][1], c2 = y < v[j][1], c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * std::sqrt(d);
}
template <class Cl>
static void cokgen(const float (*v)[2], int n, Cl renk) {
    float x0 = 1e9f, y0 = 1e9f, x1 = -1e9f, y1 = -1e9f;
    for (int i = 0; i < n; i++) { if (v[i][0] < x0) x0 = v[i][0]; if (v[i][0] > x1) x1 = v[i][0]; if (v[i][1] < y0) y0 = v[i][1]; if (v[i][1] > y1) y1 = v[i][1]; }
    sekil(x0, y0, x1, y1, [&](float x, float y) { return uCokgen(v, n, x, y); }, renk);
}
static void kapsul(float ax, float ay, float bx, float by, float ra, float rb, R c) {
    float m = ra > rb ? ra : rb;
    sekil((ax < bx ? ax : bx) - m, (ay < by ? ay : by) - m, (ax > bx ? ax : bx) + m, (ay > by ? ay : by) + m,
          [&](float x, float y) { return uKap(x, y, ax, ay, bx, by, ra, rb); }, [&](float, float, float) { return c; });
}
static void daire(float cx, float cy, float r, R c) {
    sekil(cx - r, cy - r, cx + r, cy + r, [&](float x, float y) { return uDaire(x, y, cx, cy, r); }, [&](float, float, float) { return c; });
}
static void elips(float cx, float cy, float rx, float ry, R c) {
    sekil(cx - rx, cy - ry, cx + rx, cy + ry, [&](float x, float y) { return uElips(x, y, cx, cy, rx, ry); }, [&](float, float, float) { return c; });
}

static R altin(float u) {
    static const float d[6] = {0, 0.22f, 0.45f, 0.66f, 0.85f, 1};
    static const R c[6] = {rgb(46, 26, 6), rgb(120, 76, 14), rgb(190, 134, 30), rgb(232, 178, 58), rgb(255, 226, 136), rgb(255, 250, 222)};
    u = kis(u, 0, 1);
    for (int i = 0; i < 5; i++) if (u <= d[i + 1]) return kar(c[i], c[i + 1], (u - d[i]) / (d[i + 1] - d[i]));
    return c[5];
}

static int sahneNo = 0;
static int gecisMod = 0, gecisHedef = 0; static double gecisBas = 0; static float perde = 0;
static bool caliyor = false;
static double simdi = 0, onceki = -1;
static double saatFark = -1;
static double jetonBas = -1;
static bool jetonIstek = false, jetonUcusta = false;
static int dustuBayrak = 0;
static double dustuAn = -100;
static const float KIZDUR = 600;
static const float KIZHEDEF = 772;
static float kizX = 405, kizBasX = 405, yurSure = 0;
static bool otoKamera = true; static int cekim = -1;
static bool panelAcik = false;
static float panelSagF = 0;
static int panelMod = 0; static float panelAnim = 0, panelKutu[4] = {0, 0, 0, 0};
static const float SDU = 130, SDY = -105, SDK = 0.55f;
static const float PU0 = 0.20f, PU1 = 0.78f, PV0 = 0.385f, PV1 = 0.815f;
static const float PKX = 150;
static const float PNL_X = 0.022f, PNL_Y = 0.07f, PNL_W = 0.275f, PNL_H = 0.86f, PNL_C = 0.011f;
static float plakAci = 0, calGuc = 0;
static int hava = 0;
static float ritimFaz = 0, vurusSn = 0.5f;
static uint8_t yaziBit[5][384 * 96]; static bool yaziVar[5] = {false, false, false, false, false};
static uint8_t panoBit[7][512 * 48]; static bool panoVar[7] = {}; static int panoDurum[6] = {-1, -1, -1, -1, -1, -1};
static float kapiAc[2] = {0, 0}, kapiHedef[2] = {0, 0}; static double salonSon = -1;
static int kizIs = 0; static float pd1 = 0; static bool plakIstek = false, plakRafta = false, plakKondu = false; static int plakKonduB = 0; static R plakYeni = TURKUAZ;
static int adamDurum = 0; static double adamBas = 0;
static bool balonAcik = true;
static double konusBitis = -1;
static float adamKafa[2] = {-1, -1};
static float yanAc = 0, yanHedef = 0;
static R plakRenk = TURKUAZ;

static const float YER = 762, UFUK = 700;
static const float BX0 = 640, BX1 = 1080, BY0 = 430, BY1 = 610, DX = 90, DY = -66;
static const float HCX = 800, HCY = 172, HR = 185;
static const float ADX = 240;
static const float YX = 860, YY = 490;
static const int YAPRAK = 8;

static inline void boruKutup(float x, float y, float olcek, float& rho, float& th, float& kenar, float& c) {
    float px = x - HCX, py = y - HCY;
    const float ca = std::cos(-0.30f), sa = std::sin(-0.30f);
    float qx = (px * ca - py * sa) / (HR * olcek), qy = (px * sa + py * ca) / (HR * 0.90f * olcek);
    rho = uz(qx, qy); th = std::atan2(qy, qx);
    c = std::fabs(std::cos(YAPRAK * th * 0.5f + 0.4f));
    kenar = 0.85f + 0.15f * std::sqrt(c);
}

static const float TABAN = 640;

static void masaOn() {
    sekil(1255, 562, 1515, 690, [&](float x, float y) { return uKutu(x, y, 1385, 626, 126, 62, 3); },
          [&](float x, float y, float) {
              R c = kar(rgb(104, 60, 40), rgb(64, 34, 30), kis((y - 564) / 124, 0, 1));
              if (std::fabs(std::fabs(uKutu(x, y, 1385, 626, 108, 44, 4)) - 1.2f) < 1.2f) c = rgb(50, 26, 24);
              return c; });
    sekil(1240, 546, 1530, 566, [&](float x, float y) { return uKutu(x, y, 1385, 556, 143, 8, 3); },
          [&](float, float y, float) { return y < 551 ? rgb(214, 158, 96) : rgb(156, 98, 54); });
}

static void oda() {
    float is = 1 / S;
    for (int py = 0; py < H; py++) {
        float vy = (py + 0.5f - OY) * is; uint8_t* p = T + 4 * py * W;
        for (int px = 0; px < W; px++, p += 4) {
            float vx = (px + 0.5f - OX) * is; R c;
            if (vy < TABAN) {
                c = kar(rgb(16, 40, 58), rgb(34, 88, 94), kis(vy / TABAN, 0, 1));
                float isik = std::exp(-uz(vx - 345 - PKX, vy - 270) / 400.f) * 0.34f;
                c.r += isik; c.g += isik * 0.45f; c.b += isik * 0.28f;
                float lam = std::exp(-uz(vx - 1290 - ADX, vy - 520) / 150.f) * 0.30f;
                c.r += lam; c.g += lam * 0.7f; c.b += lam * 0.3f;
                float f = kes(vx / 118.f); if (f < 0.014f) { c.r *= 0.78f; c.g *= 0.78f; c.b *= 0.78f; }
                if (vy > TABAN - 18) c = kar(rgb(70, 38, 84), rgb(36, 18, 50), (vy - (TABAN - 18)) / 18);
            } else {
                float dy = vy - 400, tx = (vx - 880) / dy * 240;
                float no = std::floor(tx / 44.f), f = tx / 44.f - no;
                float ton = 0.74f + 0.26f * sac((int)no * 7 + 3);
                float kk = kis((vy - TABAN) / (900 - TABAN), 0, 1);
                c = kar(rgb(126, 70, 62), rgb(52, 26, 40), kk); c.r *= ton; c.g *= ton; c.b *= ton;
                if (f < 0.035f) { c.r *= 0.6f; c.g *= 0.6f; c.b *= 0.6f; }
                float bx = vx - PKX - (vy - TABAN) * 1.1f;
                if (bx > 150 && bx < 540) {
                    float s = kes((vy - TABAN) / 30.f);
                    float a = yum(0, 0.08f, s) * (1 - yum(0.54f, 0.62f, s)) * 0.20f * (1 - kk) * yum(150, 175, bx) * (1 - yum(515, 540, bx));
                    c.r += a; c.g += a * 0.55f; c.b += a * 0.25f;
                }
            }
            p[0] = (uint8_t)(kis(c.r, 0, 1) * 255); p[1] = (uint8_t)(kis(c.g, 0, 1) * 255); p[2] = (uint8_t)(kis(c.b, 0, 1) * 255); p[3] = 255;
        }
    }

    OX += PKX * S;
    sekil(140, 70, 550, 450, [&](float x, float y) { return uKutu(x, y, 345, 260, 203, 188, 5); },
          [&](float x, float y, float d) {
              if (d > -11 || std::fabs(x - 345) < 5) return kar(rgb(214, 194, 164), rgb(124, 98, 104), kis((y - 70) / 380, 0, 1));
              float k = kis((y - 82) / 356, 0, 1);
#ifdef YENI_USLUP
              R c = kar(rgb(12, 20, 50), rgb(44, 54, 98), kis(k / 0.85f, 0, 1)); c = kar(c, rgb(124, 86, 100), yum(0.72f, 1.0f, k));
              { float ay = uz(x - 250, y - 170);
                if (ay < 32) c = kar(rgb(252, 244, 224), rgb(222, 210, 184), kis(uz(x - 242, y - 178) / 38, 0, 1));
                else if (ay < 72) c = kar(c, rgb(150, 160, 198), 0.32f * (1 - (ay - 32) / 40)); }
              { int ix = (int)std::floor(x / 11), iy = (int)std::floor(y / 11); float fx = kes(x / 11), fy = kes(y / 11);
                if (k < 0.62f && sac(ix * 31 + iy * 17) > 0.975f && fx > 0.38f && fx < 0.62f && fy > 0.38f && fy < 0.62f) c = rgb(236, 238, 252); }
#else
              R c = k < 0.55f ? kar(rgb(60, 30, 120), rgb(206, 86, 104), k / 0.55f) : kar(rgb(206, 86, 104), rgb(250, 176, 84), (k - 0.55f) / 0.45f);
              float gd = uz(x - 430, y - 400);
              if (gd < 118) {
                  float yk = (y - 282) / 236, serit = 1;
                  if (yk > 0.45f) serit = yum(0.22f, 0.34f, kes((yk - 0.45f) * 14));
                  c = kar(c, kar(rgb(255, 232, 150), rgb(238, 112, 44), kis(yk * 1.5f, 0, 1)), kis(118 - gd, 0, 1) * serit);
              }
#endif
              int b = (int)std::floor(x / 34); float h = 26 + 74 * sac(b * 11 + 2);
              if (y > 438 - h && kes(x / 34) > 0.08f) {
                  c = rgb(40, 18, 72);
                  if (kes(x / 8.5f) > 0.4f && kes(y / 11) > 0.45f && sac((int)(x / 8.5f) * 13 + (int)(y / 11) * 7) > 0.6f) c = rgb(250, 196, 100);
              }
              float fs = kes((y - 82) / 26);
#ifdef YENI_USLUP
              if (fs < 0.36f && y < 82 + 26 * 3) c = kar(rgb(18, 40, 54), rgb(46, 88, 100), fs / 0.36f);
#else
              if (fs < 0.36f) c = kar(rgb(18, 40, 54), rgb(46, 88, 100), fs / 0.36f);
#endif
              return c; });
    sekil(128, 446, 562, 462, [&](float x, float y) { return uKutu(x, y, 345, 454, 215, 7, 3); }, [&](float, float y, float) { return kar(rgb(226, 206, 176), rgb(150, 120, 110), (y - 447) / 14); });
    OX -= PKX * S;

    for (int i = 0; i < 3; i++) {
        float cx = 1310 + i * 124.f, cy = 250;
        static const R et[3] = {TURKUAZ, KEHRIBAR, MENEKSE};
        sekil(cx - 54, cy - 54, cx + 54, cy + 54, [&](float x, float y) { return uKutu(x, y, cx, cy, 52, 52, 3); },
              [&](float x, float y, float d) {
                  if (d > -6) return kar(rgb(96, 58, 36), rgb(50, 28, 30), kis((y - cy + 52) / 104, 0, 1));
                  float m = uz(x - cx, y - cy);
                  if (m > 37) return rgb(236, 226, 204);
                  if (m < 3) return rgb(30, 18, 30);
                  if (m < 12) return et[i];
                  return altin(0.42f + 0.16f * std::sin(m * 1.6f) + 0.34f * std::pow(std::fabs(std::cos(std::atan2(y - cy, x - cx) + 0.7f)), 8.f)); });
    }

    OX += (PKX + 10) * S;
    for (int i = 0; i < 7; i++) {
        float a = -PI * (0.10f + 0.80f * i / 6.f), u = 120 + 30 * sac(i * 9 + 1);
        float mx = 105 + std::cos(a) * u * 0.55f, my = 596 + std::sin(a) * u * 0.9f, ex = 105 + std::cos(a) * u * 1.15f, ey = my + 30 + 20 * std::fabs(std::cos(a));
        R c = kar(rgb(12, 96, 52), YESIL, sac(i * 5 + 2));
        kapsul(105, 600, mx, my, 5, 7, c); kapsul(mx, my, ex, ey, 7, 1, c);
    }
    { const float sk[4][2] = {{68, 596}, {142, 596}, {132, 672}, {78, 672}};
      cokgen(sk, 4, [&](float x, float, float) { return kar(rgb(176, 96, 20), rgb(110, 56, 14), kis((x - 68) / 74, 0, 1)); }); }
    OX -= (PKX + 10) * S;

    sekil(380, 708, 1400, 876, [&](float x, float y) { return uElips(x, y, 890, 792, 500, 80); },
          [&](float x, float y, float) {
              float m = uz((x - 890) / 500, (y - 792) / 80);
              if (m > 0.93f) return rgb(170, 94, 12);
              if (m > 0.87f) return rgb(46, 24, 84);
              return kar(rgb(88, 46, 148), rgb(66, 34, 118), 0.5f + 0.5f * std::sin(m * 14)); });
    float eOX = OX; OX += ADX * S;

    OX += 78 * S;
    kapsul(1565, 592, 1614, 462, 14, 12, rgb(74, 36, 104));
    sekil(1494, 594, 1590, 616, [&](float x, float y) { return uKutu(x, y, 1542, 605, 46, 9, 7); }, [&](float, float, float) { return rgb(58, 28, 84); });
    kapsul(1542, 614, 1542, 672, 5, 5, rgb(120, 110, 124));
    kapsul(1500, 680, 1584, 680, 5, 5, rgb(96, 86, 100));
    daire(1500, 686, 6, rgb(30, 18, 30)); daire(1584, 686, 6, rgb(30, 18, 30));
    OX -= 78 * S;
    masaOn();

    elips(1276, 532, 46, 20, rgb(255, 210, 120, 0.22f));
    kapsul(1262, 546, 1290, 546, 3, 3, altin(0.6f)); kapsul(1276, 546, 1276, 512, 2.5f, 2.5f, altin(0.7f));
    sekil(1246, 492, 1306, 520, [&](float x, float y) { float k = uElips(x, y, 1276, 516, 29, 20), h = y - 516; return k > h ? k : h; },
          [&](float x, float y, float d) { float u = (x - 1276) / 29; R c = kar(rgb(70, 220, 204), rgb(8, 104, 98), kis((y - 496) / 22 + 0.35f * u * u, 0, 1)); if (std::fabs(u + 0.35f) < 0.08f && y < 512) c = kar(c, rgb(220, 255, 248), 0.55f); if (d > -1.3f) c = kar(c, altin(0.55f), 0.7f); return c; });
    kapsul(1248, 516, 1304, 516, 1.6f, 1.6f, altin(0.6f));
    OX = eOX;
}

static void adam(double t) {
    const R ten = rgb(214, 164, 124), tenG = rgb(176, 124, 90), pant = rgb(232, 220, 196), pantG = rgb(190, 174, 146), pantK = rgb(160, 144, 118);
    const R kun = rgb(104, 54, 30), kunG = rgb(64, 30, 18), kunA = rgb(240, 228, 204), sacR = rgb(34, 22, 28);
    float bas = std::sin((float)t * 4.2f) * 2.2f * calGuc, vur = std::sin((float)t * 8.4f) * calGuc, ud = (float)(t - adamBas), sal = 0;
    if (adamDurum == 2) { bas = std::sin((float)t * 5.2f) * 2.6f; vur = std::sin((float)t * 10.4f); }
    if (adamDurum == 4 && ud < 1.3f) sal = std::sin(ud * 11) * 3.5f * (1 - ud / 1.3f);

    auto gomlek = [&](float x0, float y0, float x1, float y1, float r0, float r1, float koyu) {
        float m = r0 > r1 ? r0 : r1;
        sekil((x0 < x1 ? x0 : x1) - m - 1, (y0 < y1 ? y0 : y1) - m - 1, (x0 > x1 ? x0 : x1) + m + 1, (y0 > y1 ? y0 : y1) + m + 1, [&](float x, float y) { return uKap(x, y, x0, y0, x1, y1, r0, r1); },
              [&](float x, float y, float d) {
                  R c = kar(rgb(24, 168, 156), rgb(10, 112, 108), kis(koyu + 0.5f * kis(1 + d / (m * 0.9f), 0, 1), 0, 1));
                  float a = std::sin(x * 0.42f + std::sin(y * 0.23f) * 2.1f), b = std::sin(y * 0.39f + std::sin(x * 0.19f) * 1.7f), f = a * b;
                  if (f > 0.50f) c = kar(c, rgb(244, 178, 60), 0.9f); if (f > 0.82f) c = rgb(252, 240, 214);
                  if (f < -0.72f) c = kar(c, rgb(6, 70, 76), 0.8f);
                  return c; });
    };
    auto uzuv = [&](float x0, float y0, float x1, float y1, float r0, float r1, R c, R g) { kapsul(x0 + 1.5f, y0 + 3, x1 + 1.5f, y1 + 3, r0, r1, g); kapsul(x0, y0, x1, y1, r0 - 1.2f, r1 - 1.2f, c); };
    auto kundura = [&](float ax, float ay, float ux, float uy, bool arka) {
        float dx = ux - ax, dy = uy - ay, l = uz(dx, dy), nx = -dy / l, ny = dx / l;
        kapsul(ax + nx * 7, ay + ny * 7, ux + nx * 6.5f, uy + ny * 6.5f, 4.2f, 3.4f, rgb(30, 16, 14));
        kapsul(ax + nx * 9 - dx / l * 3, ay + ny * 9 - dy / l * 3, ax + nx * 9 + dx / l * 7, ay + ny * 9 + dy / l * 7, 4.6f, 4.6f, rgb(30, 16, 14));
        kapsul(ax, ay, ux, uy, 10.5f, 8.2f, arka ? kunG : kun);
        kapsul(ax + dx * 0.72f, ay + dy * 0.72f, ux + dx * 0.04f, uy + dy * 0.04f, 8.4f, 7.6f, arka ? rgb(196, 184, 160) : kunA);
        kapsul(ax + dx * 0.30f - nx * 6, ay + dy * 0.30f - ny * 6, ax + dx * 0.62f - nx * 5, ay + dy * 0.62f - ny * 5, 1.3f, 1.3f, kunA);
        kapsul(ax + dx * 0.10f, ay + dy * 0.10f, ax + dx * 0.12f, ay + dy * 0.12f, 11.2f, 11.2f, arka ? kunG : rgb(84, 42, 24));
    };
    auto el = [&](float ex, float ey, float yx, float yy) {
        daire(ex, ey, 8.5f, ten); for (int f = 0; f < 4; f++) { float o = (f - 1.5f) * 3.6f; kapsul(ex + yx * 5 - yy * o, ey + yy * 5 + yx * o, ex + yx * 15 - yy * o, ey + yy * 15 + yx * o, 2.4f, 2, ten); } };
    auto onKol = [&](float ex, float ey, float bx, float by) { uzuv(ex, ey, bx, by, 9.5f, 7.6f, ten, tenG); float sx = kar(ex, bx, 0.8f), sy = kar(ey, by, 0.8f); kapsul(sx - 0.5f, sy - 0.5f, sx + 0.5f, sy + 0.5f, 8.4f, 8.4f, altin(0.6f)); };
    auto kafa = [&](float hx, float hy) {
        adamKafa[0] = (hx * S + OX) / W; adamKafa[1] = (hy * S + OY) / H;
        daire(hx + 9, hy - 8, 21.5f, sacR); daire(hx + 2, hy - 15, 16, sacR); daire(hx - 8, hy - 17, 9, sacR);
        daire(hx, hy, 20, ten); elips(hx - 4, hy + 11, 14, 10, ten);
        daire(hx + 9, hy + 3, 4.6f, tenG); daire(hx + 9, hy + 3, 2.2f, ten);
        kapsul(hx - 16, hy - 8, hx - 7, hy - 9.5f, 1.6f, 1.2f, sacR);
        daire(hx - 13, hy - 3, 2.3f, rgb(30, 18, 24)); daire(hx - 13.6f, hy - 3.6f, 0.8f, rgb(255, 255, 255));
        kapsul(hx - 19, hy + 1, hx - 23, hy + 7, 3, 2.8f, tenG); kapsul(hx - 19, hy + 1, hx - 22, hy + 6, 2.2f, 2.2f, ten);
        if (simdi < konusBitis) { float ag = 1.3f + 2.4f * std::fabs(std::sin((float)t * 12.5f)); elips(hx - 13, hy + 12.6f, 4.3f, ag, rgb(96, 40, 40)); }
        else if (adamDurum == 3 || adamDurum == 5) kapsul(hx - 18, hy + 11, hx - 8, hy + 13, 1.8f, 1.8f, rgb(120, 60, 50)); else kapsul(hx - 17, hy + 12.5f, hx - 9, hy + 13, 1.4f, 1.4f, rgb(120, 60, 50));
        if (adamDurum == 2) { kapsul(hx - 4, hy - 23, hx + 20, hy - 25, 3, 3, rgb(40, 34, 48)); kapsul(hx + 20, hy - 25, hx + 26, hy - 8, 3, 3, rgb(40, 34, 48)); daire(hx + 12, hy + 2, 9, rgb(40, 34, 48)); daire(hx + 12, hy + 2, 5.5f, TURKUAZ); }
    };

    const float B = 1.35f; float eS = S, eOX = OX, eOY = OY;
    auto ac = [&](float gx, float gy) { OX = eOX + gx * eS; OY = eOY + gy * eS; S = eS * B; };
    auto kapa = [&]() { S = eS; OX = eOX; OY = eOY; };
    auto ayakkabi = [&](float ax, float ay, float ux, float uy, bool arka) { ac(ax - ax * B, ay - ay * B); kundura(ax, ay, ax + (ux - ax) / B, ay + (uy - ay) / B, arka); kapa(); };
    if (adamDurum < 2 || adamDurum == 6) {

        const float HX = 1600, HY = 568;
        uzuv(HX - 2, HY - 3, 1504, 543, 20, 17, pantG, pantK); uzuv(1504, 543, 1438, 541, 16, 13, pantG, pantK); ayakkabi(1436, 540, 1422, 504, true);
        ac(HX - 1535 * B, HY - 592 * B);
        kapsul(1536, 596, 1548, 588, 21, 22, pant);
        gomlek(1538, 588, 1566, 516, 27, 25, 0.0f);
        kapsul(1524, 592, 1552, 604, 4.2f, 4.2f, rgb(70, 36, 24)); daire(1531, 595, 3.8f, altin(0.75f));
        { const float yk[3][2] = {{1556, 506}, {1572, 500}, {1560, 536}}; cokgen(yk, 3, [&](float, float, float) { return ten; }); }
        kapsul(1556, 506, 1560, 532, 2.6f, 1.6f, rgb(252, 240, 214)); kapsul(1572, 500, 1562, 532, 2.6f, 1.6f, rgb(252, 240, 214));
        gomlek(1572, 516, 1612, 464 + bas, 12.5f, 11, 0.1f); uzuv(1612, 464 + bas, 1592, 452 + bas, 9, 8, ten, tenG);
        kapsul(1566, 502, 1569 + sal * 0.3f, 486 + bas, 8.5f, 8.5f, tenG);
        kafa(1570 + sal, 470 + bas);
        kapa();

        uzuv(HX, HY, 1508, 537, 22, 19, pant, pantG); daire(1508, 536, 18.4f, pant); kapsul(1501, 526, 1517, 522, 3.6f, 3.6f, rgb(246, 238, 220));
        uzuv(1508, 537, 1430, 532, 18, 14.5f, pant, pantG); kapsul(1588, 560, 1436, 524, 1.1f, 1.1f, rgb(204, 190, 162));
        kapsul(1434, 536, 1426, 533, 15.4f, 15.4f, pantG); kapsul(1442, 541, 1449, 544, 6, 6, KEHRIBAR);
        ayakkabi(1424, 530, 1408 + vur * 5, 492 + vur * 3, false);
        ac(HX - 1535 * B, HY - 592 * B);
        if (adamDurum == 1) {
            float k = yum(0, 0.35f, ud), ex = kar(1542, 1524, k), ey = kar(566, 548, k), bx = kar(1512, 1468, k), by = kar(562, 522, k) + 1.5f * std::sin((float)t * 2.2f);
            gomlek(1560, 524, ex, ey, 12.5f, 11.5f, 0.25f); onKol(ex, ey, bx, by); el(bx, by, -0.97f, -0.24f);
        } else if (adamDurum == 6) {
            float k = yum(0, 0.35f, ud), ex = kar(1542, 1530, k), ey = kar(566, 536, k), bx = kar(1516, 1482, k), by = kar(572, 508, k) + 1.2f * std::sin((float)t * 2.6f);
            const float dx = -0.97f, dy = -0.24f;
            gomlek(1560, 524, ex, ey, 12.5f, 11.5f, 0.25f); onKol(ex, ey, bx, by);
            daire(bx, by, 8, ten);
            for (int f = 0; f < 3; f++) daire(bx - 2.4f + f * 0.8f, by + 3.4f + f * 3.1f, 3, ten);
            for (int f = 0; f < 2; f++) kapsul(bx - 5.6f + f * 0.8f, by + 5 + f * 3.1f, bx + 0.6f + f * 0.8f, by + 5 + f * 3.1f, 0.6f, 0.6f, tenG);
            kapsul(bx + dx * 4, by + dy * 4 - 1.5f, bx + dx * 21, by + dy * 21 - 1.5f, 2.7f, 2.2f, ten);
            kapsul(bx + 1, by - 5.5f, bx + dx * 6, by - 8.5f, 2.6f, 2.1f, ten); kapsul(bx + dx * 5.4f, by - 8.2f, bx + dx * 6.2f, by - 8.6f, 1.1f, 1, tenG);
        } else { gomlek(1560, 524, 1542, 562, 12.5f, 11.5f, 0.25f); onKol(1542, 562, 1516, 572); el(1516, 572, -0.98f, 0.17f); }
        kapa();
    } else {

        float zip = adamDurum == 2 ? std::fabs(std::sin((float)t * 5.2f)) * 2 : 0, kalk = yum(0, 0.45f, ud);

        float AX = 1592, AYER = 690, adim = 0, yur = 0;
        if (adamDurum == 5) { float s = kis((ud - 0.45f) / 2.0f, 0, 1); AX = kar(1592, 1172, s); yur = s > 0 && s < 1 ? 1.f : 0.f; adim = (1592 - AX) / 46 * PI; AYER = 690 + 16 * std::sin(s * PI); }
        float hy = kar(568, 500, kalk) - zip - 3 * yur * std::fabs(std::sin(adim));
        float dz = kar(46, 0, kalk);
        float a1 = 24 * yur * std::sin(adim), l1 = 10 * yur * (std::cos(adim) > 0 ? std::cos(adim) : 0), l2 = 10 * yur * (std::cos(adim) < 0 ? -std::cos(adim) : 0), db = 7 * yur;
        uzuv(AX + 8, hy, AX + 4 - dz + a1 * 0.5f - db, (hy + AYER - 6) / 2, 20, 17, pantG, pantK); uzuv(AX + 4 - dz + a1 * 0.5f - db, (hy + AYER - 6) / 2, AX + 6 + a1, AYER - 8 - l1, 16, 13, pantG, pantK); ayakkabi(AX + 6 + a1, AYER - 8 - l1, AX - 30 + a1, AYER - 4 - l1, true);
        uzuv(AX - 8, hy, AX - 14 - dz - a1 * 0.5f - db, (hy + AYER - 2) / 2, 22, 19, pant, pantG); daire(AX - 14 - dz - a1 * 0.5f - db, (hy + AYER - 2) / 2, 18, pant); uzuv(AX - 14 - dz - a1 * 0.5f - db, (hy + AYER - 2) / 2, AX - 12 - a1, AYER - 4 - l2, 18, 14.5f, pant, pantG);
        kapsul(AX - 8 - a1, AYER - 6 - l2, AX - 16 - a1, AYER - 4 - l2, 15.4f, 15.4f, pantG); ayakkabi(AX - 12 - a1, AYER - 4 - l2, AX - 50 - a1, AYER - l2, false);
        float gx = 1462, gy = 0;
        ac(AX - gx * B, hy - 566 * B);
        gomlek(gx, 566 + gy, gx, 458 + gy, 29, 27, 0.0f);
        kapsul(gx - 22, 566, gx + 22, 566, 5, 5, rgb(70, 36, 24)); daire(gx - 4, 566, 4.4f, altin(0.75f));
        { const float yk[3][2] = {{gx - 12, 438 + gy}, {gx + 6, 436 + gy}, {gx - 6, 474 + gy}}; cokgen(yk, 3, [&](float, float, float) { return ten; }); }
        kapsul(gx - 12, 438 + gy, gx - 7, 470 + gy, 2.6f, 1.6f, rgb(252, 240, 214)); kapsul(gx + 6, 436 + gy, gx - 5, 470 + gy, 2.6f, 1.6f, rgb(252, 240, 214));
        gomlek(gx + 24, 462 + gy, gx + 34, 508 + gy, 12.5f, 11.5f, 0.15f); onKol(gx + 34, 508 + gy, gx + 28, 552 + gy); el(gx + 28, 552 + gy, -0.1f, 1);
        kapsul(gx - 2, 440 + gy, gx - 2 + sal * 0.3f, 424 + gy + bas, 8.5f, 8.5f, tenG);
        kafa(gx - 2 + sal, 404 + gy + bas);
        if (adamDurum == 3) { gomlek(gx - 24, 462 + gy, gx - 46, 492 + gy, 12.5f, 11.5f, 0.25f); onKol(gx - 46, 492 + gy, gx - 58, 448 + gy); elips(gx - 58, 445 + gy, 10.5f, 9.2f, ten);
            for (int f = 0; f < 4; f++) daire(gx - 66.5f, 439 + gy + f * 4.3f, 3.1f, ten);
            for (int f = 0; f < 3; f++) kapsul(gx - 69.5f, 441.2f + gy + f * 4.3f, gx - 62.5f, 441.2f + gy + f * 4.3f, 0.75f, 0.75f, tenG);
            kapsul(gx - 52.5f, 439 + gy, gx - 50.5f, 424 + gy, 4.6f, 3.7f, ten);
            kapsul(gx - 51.6f, 427 + gy, gx - 51.1f, 424.5f + gy, 1.5f, 1.3f, tenG); }
        else if (adamDurum == 4) { gomlek(gx - 24, 462 + gy, gx - 48, 488 + gy, 12.5f, 11.5f, 0.25f); onKol(gx - 48, 488 + gy, gx - 66, 450 + gy); el(gx - 66, 448 + gy, 0, -1); }
        else if (adamDurum == 5) {
            float k = yum(2.45f, 2.95f, ud) * (1 - yum(3.05f, 3.5f, ud)), dsx = kar(gx - 30, gx - 58, k), dsy = kar(502, 480, k) + gy, elx = kar(gx - 46, gx - 104, k), ely = kar(530, 490, k) + gy + 2 * yur * std::sin(adim * 2);
            gomlek(gx - 24, 462 + gy, dsx, dsy, 12.5f, 11.5f, 0.25f); onKol(dsx, dsy, elx, ely);
            if (ud < 3.0f) { daire(elx - 6, ely + 4, 30, rgb(20, 16, 26)); daire(elx - 6, ely + 4, 28, rgb(42, 36, 50)); for (int r = 0; r < 3; r++) daire(elx - 6, ely + 4, 24 - 5 * r, rgb(30 + 6 * r, 26 + 5 * r, 38 + 6 * r)); daire(elx - 6, ely + 4, 9.5f, plakYeni); daire(elx - 6, ely + 4, 1.6f, rgb(20, 16, 26)); }
            el(elx, ely, -1, 0); }
        else { gomlek(gx - 24, 462 + gy, gx - 38, 506 + gy, 12.5f, 11.5f, 0.25f); onKol(gx - 38, 506 + gy, gx - 54, 470 + gy); el(gx - 54, 468 + gy, 0.3f, -0.95f); }
        kapa();
    }
}

static void teker(float cx, float cy, float r) {
    sekil(cx - r, cy - r, cx + r, cy + r, [&](float x, float y) { return uDaire(x, y, cx, cy, r); },
          [&](float x, float y, float) {
              float dx = x - cx, dy = y - cy, d = uz(dx, dy), a = std::atan2(dy, dx);
              if (d > r - 9) return kar(rgb(34, 22, 30), rgb(70, 52, 60), kis(-dy / r * 0.5f + 0.5f, 0, 1) * 0.6f);
              if (d > r - 19) return altin(0.34f + 0.3f * kis(-(dx + dy) / r * 0.5f + 0.5f, 0, 1));
              if (d < 13) return altin(0.5f + 0.45f * kis(1 - uz(dx + 4, dy + 4) / 13, 0, 1));
              float f = kes(a / (2 * PI) * 12 + 0.5f) - 0.5f;
              float uz = std::fabs(f) * (2 * PI / 12) * d;
              if (uz < 3.2f) return kar(rgb(150, 92, 40), rgb(206, 148, 76), kis(1 - uz / 3.2f, 0, 1));
              return rgb(30, 16, 44, 0.55f);
          });
}

static void notaCiz(float x, float y, float b, R c, float egim) {
    float ca = std::cos(egim), sa = std::sin(egim);
    sekil(x - 14 * b, y - 10 * b, x + 14 * b, y + 10 * b, [&](float px, float py) {
        float dx = px - x, dy = py - y; float qx = dx * ca + dy * sa, qy = -dx * sa + dy * ca;
        return uElips(qx, qy, 0, 0, 9.5f * b, 6.6f * b); }, [&](float, float, float) { return c; });
    kapsul(x + 8 * b, y - 2 * b, x + 8 * b, y - 40 * b, 1.6f * b, 1.6f * b, c);
    kapsul(x + 8 * b, y - 40 * b, x + 20 * b, y - 28 * b, 2.6f * b, 0.8f * b, c);
}

#ifdef YENI_DOLAP

static inline R pirinc(float t) { return kar(rgb(122, 84, 40), rgb(240, 204, 136), kis(t, 0, 1)); }
static inline R ceviz(float t, float damar) {
    R c = kar(rgb(146, 92, 58), rgb(80, 47, 30), kis(t, 0, 1));
    const float d = 0.03f * damar; c.r += d; c.g += d * 0.62f; c.b += d * 0.38f; return c; }
static inline float yatayDamar(float x, float y) { return std::sin(y * 0.62f + std::sin(x * 0.017f + y * 0.021f) * 3.1f) + 0.45f * std::sin(y * 2.3f + x * 0.029f); }
static inline float dikeyDamar(float x, float y) { return std::sin(x * 0.58f + std::sin(y * 0.019f + x * 0.023f) * 2.8f) + 0.45f * std::sin(x * 2.1f + y * 0.027f); }
static const float GOVDE_ALT = 742;
static void ayakCiz(float x, float ust, float alt, float kay) {
    const float q[4][2] = {{x - 8.5f, ust}, {x + 8.5f, ust}, {x + kay + 4.5f, alt}, {x + kay - 4.5f, alt}};
    cokgen(q, 4, [&](float px, float py, float) {
        const float t = kis((py - ust) / (alt - ust), 0, 1), w = kar(8.5f, 4.5f, t), sx = (px - (x + kay * t)) / w;
        if (t > 0.80f) return pirinc(0.62f - 0.3f * sx);
        return ceviz(0.55f + 0.3f * sx + 0.1f * t, 0.3f * std::sin(py * 0.9f)); });
}
static void dolap() {
    const float AY = 772, G = GOVDE_ALT;

    { const float tb[4][2] = {{BX0 + 8, AY - 2}, {BX1 + 6, AY - 2}, {BX1 + DX - 4, AY + DY}, {BX0 + DX + 8, AY + DY}};
      sekil(BX0 - 40, AY + DY - 40, BX1 + DX + 60, AY + 40, [&](float x, float y) { return uCokgen(tb, 4, x, y) - 22; },
            [&](float, float, float d) { float ic = kis(-(d + 22) / 26 + 1, 0, 1); return rgb(8, 4, 20, 0.55f * ic * ic); }); }
    elips(BX0 + 25, AY + 1, 13, 3.4f, rgb(8, 4, 20, 0.6f)); elips(BX1 - 25, AY + 1, 13, 3.4f, rgb(8, 4, 20, 0.6f));
    ayakCiz(BX1 + DX - 26, G + DY, AY + DY, 4);

    const float yan[4][2] = {{BX1, BY1 - 2}, {BX1 + DX, BY1 - 2 + DY}, {BX1 + DX, G + DY}, {BX1, G}};
    cokgen(yan, 4, [&](float x, float y, float) {
        const float yy = y - (x - BX1) * (DY / DX);
        if (yy > G - 3) return pirinc(0.28f);
        return ceviz(0.72f + 0.2f * kis((x - BX1) / DX, 0, 1), yatayDamar(x * 0.3f, yy)); });

    const float cy = (BY1 - 2 + G) / 2 + 1;
    sekil(BX0, BY1 - 2, BX1, G, [&](float x, float y) { return uKutu(x, y, (BX0 + BX1) / 2, (BY1 - 2 + G) / 2, (BX1 - BX0) / 2, (G - BY1 + 2) / 2, 2); },
          [&](float x, float y, float) {
              if (y > G - 3) return pirinc(0.42f + 0.35f * (1 - std::fabs(y - (G - 1.5f)) / 1.5f));
              R c = ceviz(0.38f + 0.32f * kis((y - BY1) / (G - BY1), 0, 1), dikeyDamar(std::fabs(x - 860), y));
              for (int k = 0; k < 2; k++) {
                  const float kx = k == 0 ? 752.f : 968.f, d = std::fabs(uKutu(x, y, kx, cy, 90, 48, 6)) - 0.8f;
                  if (d < 0.7f) c = kar(pirinc(0.62f), c, kis(d + 0.3f, 0, 1));
              }
              if (std::fabs(x - 860) < 1.1f) c = rgb(36, 20, 14);
              return c; });
    kapsul(846, cy - 22, 846, cy + 22, 2.6f, 2.6f, pirinc(0.7f)); kapsul(874, cy - 22, 874, cy + 22, 2.6f, 2.6f, pirinc(0.7f));
    ayakCiz(BX0 + 30, G, AY, -5); ayakCiz(BX1 - 30, G, AY, 5);
}
#else

static void dolap() {
    const float AY = 772, krR = 247, krG = 242, krB = 229;

    { const float tb[4][2] = {{BX0 - 4, AY + 3}, {BX1 + 12, AY + 3}, {BX1 + DX + 30, AY + DY + 5}, {BX0 + DX - 4, AY + DY + 5}};
      sekil(BX0 - 60, AY + DY - 50, BX1 + DX + 100, AY + 60, [&](float x, float y) { return uCokgen(tb, 4, x, y) - 30; },
            [&](float, float, float d) { float ic = kis(-(d + 30) / 30 + 1, 0, 1); return rgb(8, 4, 20, 0.70f * ic * ic); }); }

    const float yan[4][2] = {{BX1, BY1 - 2}, {BX1 + DX, BY1 - 2 + DY}, {BX1 + DX, AY + DY}, {BX1, AY}};
    cokgen(yan, 4, [&](float x, float y, float) {
        R c = kar(rgb(206, 197, 178), rgb(168, 158, 142), kis((x - BX1) / DX, 0, 1));
        float yy = y - (x - BX1) * (DY / DX);
        if (yy > AY - 22) c = altin(0.26f + 0.2f * kis(1 - (x - BX1) / DX, 0, 1));
        return c; });

    sekil(BX0, BY1 - 2, BX1, AY, [&](float x, float y) { return uKutu(x, y, (BX0 + BX1) / 2, (BY1 - 2 + AY) / 2, (BX1 - BX0) / 2, (AY - BY1 + 2) / 2, 2); },
          [&](float x, float y, float) {
              R c = kar(rgb((int)krR - 14, (int)krG - 16, (int)krB - 22), rgb(212, 203, 182), kis((y - BY1) / (AY - BY1), 0, 1));
              if (y > AY - 22) return altin(0.28f + 0.5f * (1 - std::fabs((y - (AY - 12)) / 11)) + 0.06f * std::sin(x * 0.07f));
              for (int k = 0; k < 2; k++) {
                  float cx = k == 0 ? 752.f : 968.f, cy = (BY1 + AY - 22) / 2 + 2, d = uKutu(x, y, cx, cy, 92, 52, 8);
                  if (d < 0) c = kar(c, rgb(232, 224, 204), 0.55f);
                  if (std::fabs(d) < 2.2f) c = altin(0.72f - 0.2f * std::fabs(d) / 2.2f);
                  float d2 = std::fabs(uKutu(x, y, cx, cy, 78, 38, 5)) - 0.9f; if (d2 < 0.6f) c = kar(altin(0.5f), c, kis(d2 + 0.4f, 0, 1));
              }
              float t1 = uz(x - 846, y - (BY1 + AY - 22) / 2 - 2), t2 = uz(x - 874, y - (BY1 + AY - 22) / 2 - 2);
              if (t1 < 7 || t2 < 7) { float m = t1 < t2 ? t1 : t2; return altin(0.45f + 0.5f * (1 - m / 7)); }
              if (std::fabs(x - 860) < 1.2f) c = kar(c, rgb(120, 100, 70), 0.6f);
              return c; });
    kapsul(BX0 + 1, AY + 0.5f, BX1 - 1, AY + 0.5f, 1.6f, 1.6f, rgb(14, 6, 24, 0.78f)); kapsul(BX1, AY + 0.5f, BX1 + DX, AY + DY + 0.5f, 1.6f, 1.6f, rgb(14, 6, 24, 0.70f));
}
#endif

static void araba() {

    sekil(480, 730, 1320, 810, [&](float x, float y) { return uElips(x, y, 900, 768, 400, 30); },
          [&](float x, float y, float d) { return rgb(8, 4, 20, 0.55f * kis(-d / 26, 0, 1)); });

    const float ust[4][2] = {{590, 610}, {1130, 610}, {1130 + DX, 610 + DY}, {590 + DX, 610 + DY}};
    cokgen(ust, 4, [&](float x, float y, float) { return kar(rgb(196, 138, 78), rgb(160, 104, 54), kis((x - 590) / 640, 0, 1)); });
    const float yan[4][2] = {{1130, 610}, {1130 + DX, 610 + DY}, {1130 + DX, 650 + DY}, {1130, 650}};
    cokgen(yan, 4, [&](float, float, float) { return rgb(92, 54, 30); });

    teker(1030 + DX * 0.9f, 700 + DY * 0.55f, 56);
    sekil(590, 610, 1130, 650, [&](float x, float y) { return uKutu(x, y, 860, 630, 270, 20, 3); },
          [&](float x, float y, float) {
              float f = kes((x - 590) / 90);
              R c = kar(rgb(168, 108, 56), rgb(126, 76, 38), kis((y - 610) / 40, 0, 1));
              if (f < 0.03f) c = rgb(84, 48, 24);
              if (y < 614) c = rgb(214, 160, 96);
              return c;
          });

    kapsul(596, 628, 512, 588, 6.5f, 6.5f, rgb(134, 82, 42));
    kapsul(520, 592, 500, 582, 8, 8, altin(0.62f));

    kapsul(610, 650, 604, 756, 6, 5, rgb(110, 66, 34));

    teker(1030, 700, 62);
    teker(720, 700, 62);
}

#ifdef YENI_DOLAP
static void kutu() {

    const float yan[4][2] = {{BX1, BY0}, {BX1 + DX, BY0 + DY}, {BX1 + DX, BY1 + DY}, {BX1, BY1}};
    cokgen(yan, 4, [&](float x, float y, float) {
        const float yy = y - (x - BX1) * (DY / DX);
        if (yy < BY0 + 3) return pirinc(0.4f);
        if (yy > BY1 - 4) return rgb(30, 18, 14);
        return ceviz(0.7f + 0.2f * kis((x - BX1) / DX, 0, 1), yatayDamar(x * 0.3f, yy)); });

    const float ust[4][2] = {{BX0, BY0}, {BX1, BY0}, {BX1 + DX, BY0 + DY}, {BX0 + DX, BY0 + DY}};
    cokgen(ust, 4, [&](float x, float y, float d) {
        if (d > -2.2f) return pirinc(0.72f);
        return ceviz(0.18f + 0.22f * kis((BY0 - y) / -DY, 0, 1), yatayDamar(x, y * 3)); });

    sekil(BX0, BY0, BX1, BY1, [&](float x, float y) { return uKutu(x, y, (BX0 + BX1) / 2, (BY0 + BY1) / 2, (BX1 - BX0) / 2, (BY1 - BY0) / 2, 2); },
          [&](float x, float y, float) {
              if (y < BY0 + 3.5f) return pirinc(0.9f - 0.3f * (y - BY0) / 3.5f);
              if (y > BY1 - 4) return rgb(30, 18, 14);
              R c = ceviz(0.26f + 0.4f * kis((y - BY0) / (BY1 - BY0), 0, 1), yatayDamar(x, y));
              const float kd = uKutu(x, y, 860, 448, 196, 7, 7);
              if (kd < 1.4f) {
                  if (kd > -0.2f) return kar(pirinc(0.66f), c, kis(kd - 0.6f, 0, 1));
                  R cam = kar(rgb(34, 24, 20), rgb(20, 14, 12), kis((y - 441) / 14, 0, 1));
                  if (std::fabs(kes((x - 664) / 14.f) - 0.5f) > 0.45f && std::fabs(y - 448) < 3.2f) cam = kar(cam, pirinc(0.45f), 0.55f);
                  return cam;
              }
              return c; });

    for (int k = 0; k < 2; k++) {
        const float cx = k == 0 ? 731.f : 989.f, cy = 530, hw = 75, hh = 62;
        sekil(cx - hw - 2, cy - hh - 2, cx + hw + 2, cy + hh + 2, [&](float x, float y) { return uKutu(x, y, cx, cy, hw, hh, 12); },
              [&](float x, float y, float d) {
                  if (d > -2.0f) return pirinc(0.5f + 0.3f * kis((cy - y) / hh, 0, 1));
                  const float ip = 0.5f + 0.5f * std::sin(x * 2.4f) * std::sin(y * 2.4f);
                  R c = kar(rgb(40, 31, 30), rgb(62, 49, 44), ip * 0.6f + 0.2f);
                  const float gol = kis((y - (cy - hh)) / (2 * hh), 0, 1) * 0.22f; c.r *= 1 - gol; c.g *= 1 - gol; c.b *= 1 - gol;
                  if (std::fabs(y - cy) < hh - 8) {
                      const float off = y - (cy + 25 * std::round((y - cy) / 25));
                      if (std::fabs(off) < 1.7f) return ceviz(0.25f + 0.25f * (off + 1.7f) / 3.4f, yatayDamar(x, y));
                      if (off > 1.7f && off < 3.6f) { c.r *= 0.7f; c.g *= 0.7f; c.b *= 0.7f; }
                  }
                  return c; });
    }

    sekil(824, 460, 896, 598, [&](float x, float y) { return uKutu(x, y, 860, 529, 34, 67, 10); },
          [&](float x, float y, float d) {
              if (d > -1.8f) return pirinc(0.85f - 0.45f * kis((y - 466) / 120, 0, 1));
              return pirinc(0.42f + 0.26f * kis(1 - (y - 462) / 132, 0, 1) + 0.05f * std::sin(x * 1.7f) + 0.03f * std::sin(x * 5.3f)); });
    sekil(836, 482, 884, 498, [&](float x, float y) { return uKutu(x, y, YX, YY, 22, 5, 4); },
          [&](float, float, float d) { return d > -1.6f ? pirinc(0.95f) : rgb(22, 12, 8); });
    sekil(841, 530, 879, 568, [&](float x, float y) { return uDaire(x, y, 860, 549, 17); },
          [&](float x, float y, float d) { if (d > -2.4f) return pirinc(0.28f); const float m = uz(x - 855, y - 544) / 15; return pirinc(0.5f + 0.45f * kis(1 - m, 0, 1)); });
    sekil(858, 534, 862, 546, [&](float x, float y) { return uKutu(x, y, 860, 540, 1.2f, 5, 1.2f); }, [&](float, float, float) { return rgb(60, 38, 18); });
}

static void kadranIsigi(double) {
    if (calGuc < 0.02f) return;
    const float vur = std::pow(0.5f + 0.5f * std::cos(ritimFaz), 6.f), a = calGuc * (0.55f + 0.45f * vur);
    sekil(664, 438, 1056, 458, [&](float x, float y) { return uKutu(x, y, 860, 448, 195, 6, 6); },
          [&](float x, float y, float) {
              const float m = std::fabs(y - 448), cizgi = std::exp(-m * m / 3.f), hale = std::exp(-m * m / 30.f) * 0.5f;
              const float uc = kis((195 - std::fabs(x - 860)) / 40, 0, 1);
              return rgb(255, 178, 84, kis((cizgi + hale) * a * uc, 0, 1)); });
}
#else
static void kutu() {
    const R krem = rgb(247, 242, 229);

    const float yan[4][2] = {{BX1, BY0}, {BX1 + DX, BY0 + DY}, {BX1 + DX, BY1 + DY}, {BX1, BY1}};
    cokgen(yan, 4, [&](float x, float y, float) {
        R c = kar(rgb(212, 203, 184), rgb(176, 166, 150), kis((x - BX1) / DX, 0, 1));
        float yy = y - (x - BX1) * (DY / DX);
        if (yy < BY0 + 11 || yy > BY1 - 20) c = altin(0.30f + 0.2f * kis(1 - (x - BX1) / DX, 0, 1));
        return c; });

    const float ust[4][2] = {{BX0, BY0}, {BX1, BY0}, {BX1 + DX, BY0 + DY}, {BX0 + DX, BY0 + DY}};
    cokgen(ust, 4, [&](float x, float y, float d) {
        R c = kar(rgb(255, 252, 244), rgb(236, 229, 212), kis((BY0 - y) / -DY, 0, 1));
        if (d > -5) c = altin(0.62f);
        return c; });

    sekil(BX0, BY0, BX1, BY1, [&](float x, float y) { return uKutu(x, y, (BX0 + BX1) / 2, (BY0 + BY1) / 2, (BX1 - BX0) / 2, (BY1 - BY0) / 2, 2); },
          [&](float x, float y, float) {
              R c = kar(krem, rgb(226, 218, 198), kis((y - BY0) / (BY1 - BY0), 0, 1));

              if (y < BY0 + 11) return altin(0.42f + 0.5f * (1 - std::fabs((y - BY0 - 5) / 6)) + 0.08f * std::sin(x * 0.09f));
              if (y > BY1 - 20) return altin(0.30f + 0.5f * (1 - std::fabs((y - (BY1 - 11)) / 10)) + 0.06f * std::sin(x * 0.07f));

              float cd = std::fabs(uKutu(x, y, (BX0 + BX1) / 2, (BY0 + BY1) / 2 - 4, (BX1 - BX0) / 2 - 16, (BY1 - BY0) / 2 - 30, 10)) - 1.6f;
              if (cd < 0.8f) c = kar(altin(0.6f), c, kis(cd + 0.2f, 0, 1));
              return c; });

    for (int k = 0; k < 2; k++) {
        float cx = k == 0 ? 742 : 978, cy = 574, rx = 72, ry = 84;
        sekil(cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + 12, [&](float x, float y) {
            float d = uElips(x, y, cx, cy, rx, ry), a = y - cy; return (d > a ? d : a); },
              [&](float x, float y, float d) {
                  float dx = x - cx, dy = cy - y, m = uz(dx, dy * (rx / ry)), a = std::atan2(dy, dx);
                  if (d > -4.5f) return altin(0.55f + 0.35f * kis((d + 4.5f) / 4.5f, 0, 1) - 0.3f * kis((y - cy + 6) / 6, 0, 1));
                  float f = kes(a / PI * 9 + 0.5f) - 0.5f, uz = std::fabs(f) * (PI / 9) * m;
                  float h1 = std::fabs(m - 24), h2 = std::fabs(m - 48), en = uz < h1 ? uz : h1; if (h2 < en) en = h2;
                  if (m < 9) return altin(0.8f);
                  if (en < 2.4f) return altin(0.75f - 0.25f * en / 2.4f);
                  return kar(rgb(96, 60, 14), rgb(40, 24, 6), kis(m / 70, 0, 1)); });
    }

    sekil(804, 462, 916, 596, [&](float x, float y) { return uKutu(x, y, 860, 529, 50, 62, 16); },
          [&](float x, float y, float d) {
              float u = 0.38f + 0.34f * kis(1 - (y - 467) / 124, 0, 1) + 0.10f * std::sin((x + y) * 0.11f);
              if (d > -4) u = 0.85f - 0.45f * kis((y - 500) / 60, 0, 1);
              else if (d > -7) u = 0.2f;
              return altin(u); });
    sekil(836, 482, 884, 498, [&](float x, float y) { return uKutu(x, y, YX, YY, 22, 5, 4); },
          [&](float, float, float d) { return d > -1.6f ? altin(0.9f) : rgb(24, 12, 4); });
    sekil(838, 527, 882, 571, [&](float x, float y) { return uDaire(x, y, 860, 549, 20); },
          [&](float x, float y, float d) { return altin(d > -3 ? 0.3f : 0.45f + 0.55f * kis(1 - uz(x - 853, y - 541) / 17, 0, 1)); });

    for (int k = 0; k < 2; k++) {
        float cx = k == 0 ? BX0 + 20 : BX1 - 20;
        sekil(cx - 26, BY1 - 6, cx + 26, BY1 + 8, [&](float x, float y) { return uKutu(x, y, cx, BY1 + 1, 24, 6, 5); },
              [&](float x, float, float) { return altin(0.4f + 0.4f * (1 - std::fabs(x - cx) / 24)); });
    }
}
#endif

static void tablaVePlak() {
    const float cx = (BX0 + BX1) / 2 + DX / 2 - 18, cy = BY0 + DY / 2 + 2, rx = 168, ry = 27;
    elips(cx, cy + 9, rx, ry, altin(0.2f));
    sekil(cx - rx, cy - ry, cx + rx, cy + ry, [&](float x, float y) { return uElips(x, y, cx, cy, rx, ry); },
          [&](float x, float y, float d) { return altin(0.5f + 0.3f * std::cos(std::atan2((y - cy) * rx / ry, x - cx) * 2 + 0.6f) + (d > -3 ? 0.2f : 0)); });
    const float px = 150, py = 23;
    sekil(cx - px, cy - 3 - py, cx + px, cy - 3 + py, [&](float x, float y) { return uElips(x, y, cx, cy - 3, px, py); },
          [&](float x, float y, float) {
              float dx = (x - cx) / px, dy = (y - (cy - 3)) / py, m = uz(dx, dy), a = std::atan2(dy, dx);
              if (m < 0.34f) {
                  if (m < 0.045f) return altin(0.9f);
                  float da = a - plakAci; float iz = std::cos(da);
                  R c = kar(plakRenk, rgb(255, 255, 255), 0.12f + 0.28f * kis(iz, 0, 1) * (m > 0.14f ? 1 : 0.3f));
                  if (std::fabs(m - 0.25f) < 0.012f) c = kar(c, rgb(255, 250, 230), 0.7f);
                  return c;
              }
              float oluk = 0.5f + 0.5f * std::sin(m * 150);
              float isik = std::pow(std::fabs(std::cos(a + 0.5f)), 14.f);
              float cizik = std::pow(kis(std::cos(a - plakAci * 1.0f - 1.3f), 0, 1), 60.f) * 0.35f;
              float v = 0.06f + 0.05f * oluk + 0.42f * isik * (0.6f + 0.4f * oluk) + cizik;
              return R{v * 1.02f, v * 0.98f, v * 1.1f, 1}; });

    kapsul(cx + 150, cy - 26, cx + 150, cy - 6, 9, 11, altin(0.5f));
    kapsul(cx + 150, cy - 26, cx + 84, cy - 6, 4, 3.2f, altin(0.78f));
    kapsul(cx + 92, cy - 9, cx + 74, cy - 3, 6, 5, altin(0.55f));
}

static inline void boruKenarHizli(float x, float y, float& rho, float& kenar) {
    float px = x - HCX, py = y - HCY;
    static const float ca = std::cos(-0.30f), sa = std::sin(-0.30f), c4 = std::cos(0.4f), s4 = std::sin(0.4f);
    float qx = (px * ca - py * sa) / HR, qy = (px * sa + py * ca) / (HR * 0.90f);
    rho = std::sqrt(qx * qx + qy * qy);
    float ir = rho > 1e-6f ? 1 / rho : 0, c = qx * ir, sn = qy * ir;
    float c2 = 2 * c * c - 1, s2 = 2 * sn * c, cc4 = 2 * c2 * c2 - 1, ss4 = 2 * s2 * c2;
    kenar = 0.85f + 0.15f * std::sqrt(std::fabs(cc4 * c4 - ss4 * s4));
}

static void dalgalar(double t) {
    if (calGuc < 0.02f) return;
    const float M = HR * 1.80f;
    float ol[3], kal[3], al[3];
    for (int i = 0; i < 3; i++) { float f = kes((float)t * 0.55f + i / 3.f); ol[i] = 1.06f + 0.62f * f; kal[i] = 5.5f - 3 * f; al[i] = (1 - f) * (1 - f) * 0.7f * calGuc; }
    sekil(HCX - M, HCY - M, HCX + M, HCY + M, [&](float x, float y) { return uDaire(x, y, HCX, HCY, M); },
          [&](float x, float y, float) {
              float rho, ke; boruKenarHizli(x, y, rho, ke);
              if (rho < ke * 0.9f) return R{0, 0, 0, 0};
              float m = uz(x - HCX, y - HCY) / M; if (m > 1) m = 1;
              R c = rgb(255, 196, 96, 0.34f * calGuc * (1 - m) * (1 - m));
              for (int i = 0; i < 3; i++) {
                  float d = std::fabs(rho / ol[i] - ke) * HR * ol[i] * 0.93f - kal[i];
                  float a = kis(0.5f - d * S, 0, 1) * al[i]; if (a <= 0) continue;
                  R h = i == 1 ? rgb(120, 232, 220) : rgb(255, 226, 160);
                  float ta = a + c.a * (1 - a);
                  c.r = (h.r * a + c.r * c.a * (1 - a)) / ta; c.g = (h.g * a + c.g * c.a * (1 - a)) / ta; c.b = (h.b * a + c.b * c.a * (1 - a)) / ta; c.a = ta;
              }
              return c; });
}

static void boru() {
    const float nab = 1;

    const float p0x = 1108, p0y = 388, p1x = 1118, p1y = 262, p2x = 1012, p2y = 262;
    elips(p0x, p0y + 2, 30, 9, altin(0.3f));
    elips(p0x, p0y - 3, 24, 7, altin(0.72f));
    float sonR = 1;
    sekil(960, 220, 1160, 400, [&](float x, float y) {
        float en = 1e9f; float ox = p0x, oy = p0y;
        for (int i = 1; i <= 14; i++) {
            float s = i / 14.f, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
            float nx = a * p0x + b * p1x + c * p2x, ny = a * p0y + b * p1y + c * p2y;
            float r0 = kar(13, 23, (i - 1) / 14.f), r1 = kar(13, 23, s), h;
            float d = uKap(x, y, ox, oy, nx, ny, r0, r1, &h);
            if (d < en) { en = d; sonR = kar(r0, r1, h); }
            ox = nx; oy = ny;
        }
        return en; },
          [&](float x, float y, float d) { float k = kis(-d / sonR, 0, 1); return altin(0.14f + 0.78f * std::pow(k, 0.55f) - 0.12f * kis((y - 250) / 140, 0, 1)); });

    kapsul(1100, 318, 1132, 318, 5, 5, altin(0.85f));

    float hb;
    sekil(760, 40, 1050, 330, [&](float x, float y) { return uKap(x, y, p2x, p2y, 842, 190, 22, 146, &hb); },
          [&](float x, float y, float d) {
              float u = 0.50f - (y - 190) / 300 + 0.10f * std::sin(std::atan2(y - 262, x - 1012) * 22);
              u -= 0.25f * kis(1 + d / 14, 0, 1);
              return altin(kis(u, 0.08f, 0.7f)); });

    float m = HR * nab * 1.06f;
    sekil(HCX - m, HCY - m, HCX + m, HCY + m, [&](float x, float y) {
        float rho, th, ke, c; boruKutup(x, y, nab, rho, th, ke, c); return (rho - ke) * HR * 0.93f; },
          [&](float x, float y, float) {
              float rho, th, ke, c; boruKutup(x, y, nab, rho, th, ke, c);
              float rn = rho / ke;
              float isik = std::cos(th) * -0.55f + std::sin(th) * -0.75f;
              float u = 0.50f - 0.26f * isik * yum(0.1f, 0.9f, rn);
              float kivrim = 1 - yum(0.0f, 0.30f, c);
              u -= 0.34f * kivrim * yum(0.25f, 1.0f, rn);
              u += 0.16f * std::pow(c, 5.f) * rn;

              float h1 = std::fabs(rn - 0.40f), h2 = std::fabs(rn - 0.445f);
              if (h1 < 0.008f || h2 < 0.006f) u -= 0.22f;
              if (rn > 0.50f && rn < 0.90f) {
                  float ya = kes((YAPRAK * th * 0.5f + 0.4f) / PI) - 0.5f;
                  float gen = std::fabs(ya) * 2;
                  float damla = uz(gen * 2.6f, (rn - 0.70f) * 6.0f);
                  if (std::fabs(damla - 1) < 0.07f) u -= 0.24f;
                  else if (damla < 1) { u += 0.05f; if (std::fabs(kes(rn * 26) - 0.5f) < 0.10f && gen < 0.30f) u -= 0.16f; if (gen < 0.02f) u -= 0.18f; }
              }
              u += 0.42f * yum(0.935f, 0.985f, rn);

              float px = x - HCX, py = y - HCY; float rt = uz(px - 16, py - 20) / HR;
              u = kar(-0.05f, u, yum(0.05f, 0.30f, rt));
              if (rt < 0.30f) u += 0.10f * yum(0.30f, 0.12f, rt) * kis(-isik, 0, 1);
              return altin(u); });
}

struct Yer { float s, ox, oy; };
static Yer yerAc(float gx, float gy, float k) { Yer e{S, OX, OY}; OX = OX + gx * S; OY = OY + gy * S; S = S * k; return e; }
static void yerKapa(Yer e) { S = e.s; OX = e.ox; OY = e.oy; }
#include "kiz.inc"
#include "uc.inc"

static void jeton(double t) {
    float u = jetonBas >= 0 ? (float)(t - jetonBas) : -1;
    (void)u;

    float p = (float)(t - dustuAn);
    if (p >= 0 && p < 0.7f) {
        float k = p / 0.7f, rr = 14 + 120 * k;
        sekil(YX - rr - 6, YY - rr - 6, YX + rr + 6, YY + rr + 6, [&](float x, float y) { return std::fabs(uDaire(x, y, YX, YY, rr)) - (5 - 4 * k); },
              [&](float, float, float) { return rgb(255, 236, 170, (1 - k) * (1 - k) * 0.9f); });
        for (int i = 0; i < 8; i++) { float a = i * PI / 4 + 0.3f, r0 = 10 + 30 * k, r1 = 26 + 90 * k;
            kapsul(YX + std::cos(a) * r0, YY + std::sin(a) * r0, YX + std::cos(a) * r1, YY + std::sin(a) * r1, 2.6f * (1 - k), 0.6f, rgb(255, 244, 200, (1 - k))); }
    }
}

static void notalar(double t) {
    if (calGuc < 0.02f) return;
    static const R rk[4] = {rgb(251, 191, 36), rgb(45, 212, 191), rgb(74, 222, 128), rgb(167, 139, 250)};
    for (int i = 0; i < 9; i++) {
        float f = kes((float)t * 0.27f + i * 0.111f + sac(i * 3) * 0.05f);
        float a = -PI * (0.08f + 0.86f * sac(i * 17 + 4));
        float uz = HR * (0.95f + 1.25f * f);
        float x = HCX + std::cos(a) * uz * 1.25f + std::sin((float)t * 2 + i) * 14, y = HCY + std::sin(a) * uz * 0.9f - 40 * f;
        R c = rk[i % 4]; c.a = yum(0, 0.15f, f) * (1 - yum(0.6f, 1, f)) * calGuc;
        notaCiz(x, y, 1.0f + 0.5f * sac(i * 5 + 1), c, -0.35f);
    }
}

static float havaGuc[3] = {0, 0, 0}; static double havaSon = -1;
static void odaHavasi(double t) {
    float dt = havaSon < 0 ? 0.f : (float)(t - havaSon); if (dt < 0) dt = 0; if (dt > 0.25f) dt = 0.25f; havaSon = t;
    for (int h = 0; h < 3; h++) { float hd = (caliyor && hava == h) ? 1.f : 0.f; havaGuc[h] += (hd - havaGuc[h]) * (1 - std::exp(-dt * 1.5f)); }
    const float bal = havaGuc[1] * calGuc, nor = havaGuc[0] * calGuc, par = havaGuc[2] * calGuc;
    if (bal + nor + par < 0.01f) return;
    const float vurus = 0.5f + 0.5f * std::cos(ritimFaz);
    const float kr = 1 - 0.26f * bal - 0.10f * nor - 0.40f * par, kg = 1 - 0.33f * bal - 0.12f * nor - 0.44f * par, kb = 1 - 0.44f * bal - 0.08f * nor - 0.28f * par;
    const unsigned ir = (unsigned)(kr * 256), ig = (unsigned)(kg * 256), ib = (unsigned)(kb * 256);
    if (bal < 0.01f) {
        uint8_t* q = CIK; for (size_t i = 0, n = (size_t)W * H; i < n; i++, q += 4) { q[0] = (uint8_t)((q[0] * ir) >> 8); q[1] = (uint8_t)((q[1] * ig) >> 8); q[2] = (uint8_t)((q[2] * ib) >> 8); }
    } else {
        const float lx = (kizX + 840) * 0.5f, is = 1 / S;
        for (int py = 0; py < H; py++) {
            uint8_t* sat = CIK + 4 * (size_t)py * W;
            { uint8_t* q = sat; for (int px = 0; px < W; px++, q += 4) { q[0] = (uint8_t)((q[0] * ir) >> 8); q[1] = (uint8_t)((q[1] * ig) >> 8); q[2] = (uint8_t)((q[2] * ib) >> 8); } }
            const float vy = (py + 0.5f - OY) * is, u = kis((vy + 140) / 940, 0, 1), yg = 70 + 410 * u, ys = 30 + 150 * u, ka = 0.20f * bal * (1 - 0.45f * u);
            float fy = (vy - 780) / 64; fy *= fy; const bool yerde = fy < 1; const float gx = yerde && 520 > yg ? 520 : yg;
            int xa = (int)std::floor((lx - gx) * S + OX), xb = (int)std::ceil((lx + gx) * S + OX); if (xa < 0) xa = 0; if (xb > W) xb = W;
            uint8_t* q = sat + 4 * xa;
            for (int px = xa; px < xb; px++, q += 4) {
                const float dx = (px + 0.5f - OX) * is - lx; float a = ka * kis((yg - std::fabs(dx)) / ys, 0, 1);
                if (yerde) { const float fx = dx / 520, e = fx * fx + fy; if (e < 1) a += 0.20f * bal * (1 - e); }
                if (a <= 0.002f) continue;
                q[0] = (uint8_t)(q[0] + (255 - q[0]) * a); q[1] = (uint8_t)(q[1] + (206 - q[1]) * a); q[2] = (uint8_t)(q[2] + (142 - q[2]) * a);
            }
        }
        for (int i = 0; i < 18; i++) {
            float f = kes((float)t * 0.035f + sac(i * 13 + 5)), x = lx - 260 + 520 * sac(i * 7 + 1) + 18 * std::sin((float)t * 0.7f + i), y = 720 - 760 * f;
            daire(x, y, 1.8f + 1.4f * sac(i * 3 + 2), rgb(255, 236, 196, 0.5f * bal * std::sin(f * PI))); }
    }
    if (nor + par > 0.01f) {
        static const R RENK[4] = {KEHRIBAR, TURKUAZ, YESIL, MENEKSE};
        const float hiz = 0.16f + 0.6f * par; const int n = par > 0.02f ? 14 : 7;
        for (int i = 0; i < n; i++) {
            float a = (float)t * hiz + i * 2 * PI / n + sac(i * 5 + 1) * 1.3f;
            float x = 760 + 640 * std::cos(a) + 120 * std::sin(a * 1.7f + i), y = 330 + 300 * std::sin(a * 0.8f + i * 0.9f);
            bool yer = y > 640; float rx = yer ? 92 : 66, ry = yer ? 24 : 50;
            R c = RENK[i % 4]; float al = 0.22f * nor + (0.38f + 0.22f * vurus) * par;
            sekil(x - rx, y - ry, x + rx, y + ry, [&](float px, float py) { return uElips(px, py, x, y, rx, ry); }, [&](float, float, float d) { R k = c; k.a = al * kis(-d / (ry * 0.9f), 0, 1); return k; });
        }
        if (par > 0.01f) {
            const float bx = 470, by = 46;
            kapsul(bx, -160, bx, by - 27, 1.2f, 1.2f, rgb(130, 128, 140, par));
            sekil(bx - 30, by - 30, bx + 30, by + 30, [&](float x, float y) { return uDaire(x, y, bx, by, 27); }, [&](float x, float y, float) {
                float u = (x - bx) / 27, v = (y - by) / 27; int ix = (int)std::floor(u * 7 + (float)t * 2.2f), iy = (int)std::floor(v * 7);
                float g = 0.62f + 0.36f * sac(ix * 11 + iy * 7 + 40) + 0.45f * kis(1 - uz(u + 0.35f, v + 0.4f) * 1.4f, 0, 1) - 0.25f * kis(uz(u, v) - 0.6f, 0, 1); R c = rgb(214, 218, 232); c.r *= g; c.g *= g; c.b *= g; c.a = par; return c; });
            daire(bx - 9, by - 10, 5, rgb(255, 255, 255, 0.85f * par));
            for (int i = 0; i < 3; i++) { float f = kes((float)t * 1.3f + i * 0.33f); int k = (int)std::floor((float)t * 1.3f + i * 0.33f);
                daire(bx - 15 + 30 * sac(i * 9 + k), by - 15 + 30 * sac(i * 5 + 3 + k), 2.6f * std::sin(f * PI), rgb(255, 255, 255, par * std::sin(f * PI))); }
        }
    }
}

static void karart() {
    float is = 1 / S;
    for (int py = 0; py < H; py++) {
        float vy = (py + 0.5f - OY) * is; uint8_t* p = T + 4 * py * W;
        for (int px = 0; px < W; px++, p += 4) {
            float vx = (px + 0.5f - OX) * is;
            float m = uz((vx - 930) / 1250, (vy - 430) / 700);
            float k = 1 - 0.55f * yum(0.55f, 1.25f, m);
            if (k < 0.999f) { p[0] = (uint8_t)(p[0] * k); p[1] = (uint8_t)(p[1] * k); p[2] = (uint8_t)(p[2] * k); }
        }
    }
}

static void bitBas(const uint8_t* bit, int bw, int bh, float cx, float cy, float gw, float gh, int rr, int gg, int bb) {
    int x0 = (int)std::floor((cx - gw) * S + OX), x1 = (int)std::ceil((cx + gw) * S + OX), y0 = (int)std::floor((cy - gh) * S + OY), y1 = (int)std::ceil((cy + gh) * S + OY);
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > W) x1 = W; if (y1 > H) y1 = H;
    for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++) {
        float u = ((x + 0.5f - OX) / S - (cx - gw)) / (2 * gw) * bw - 0.5f, v = ((y + 0.5f - OY) / S - (cy - gh)) / (2 * gh) * bh - 0.5f;
        int iu = (int)std::floor(u), iv = (int)std::floor(v); if (iu < 0 || iv < 0 || iu >= bw - 1 || iv >= bh - 1) continue;
        float au = u - iu, av = v - iv; const uint8_t* b = bit + iv * bw + iu;
        float a = (b[0] * (1 - au) + b[1] * au) * (1 - av) + (b[bw] * (1 - au) + b[bw + 1] * au) * av; if (a < 2) continue;
        a *= 1 / 255.f; uint8_t* d = T + 4 * (y * W + x);
        d[0] = (uint8_t)(d[0] * (1 - a) + rr * a); d[1] = (uint8_t)(d[1] * (1 - a) + gg * a); d[2] = (uint8_t)(d[2] * (1 - a) + bb * a);
    }
}
static void yaziBas(int k, float cx, float cy, float gw, float gh, int rr, int gg, int bb) { if (yaziVar[k]) bitBas(yaziBit[k], 384, 96, cx, cy, gw, gh, rr, gg, bb); }

#ifdef YENI_DOLAP
static void kapakYazi() { const float cy = (BY1 - 2 + GOVDE_ALT) / 2 + 1; yaziBas(0, 752, cy, 74, 18.5f, 240, 208, 150); yaziBas(1, 968, cy, 74, 18.5f, 240, 208, 150); }
#else
static void kapakYazi() { const float cy = (BY1 + 772 - 22) / 2 + 2; yaziBas(0, 752, cy, 74, 18.5f, 132, 92, 24); yaziBas(1, 968, cy, 74, 18.5f, 132, 92, 24); }
#endif

static void adamHikaye(double t) {
    float u = (float)(t - adamBas);
    auto para = [&](float x, float y, float r) { daire(x, y, r, rgb(96, 58, 10)); daire(x, y, r - 1.6f, altin(0.72f)); daire(x - r * 0.25f, y - r * 0.3f, r * 0.35f, altin(0.95f)); };
    if (adamDurum == 1 && balonAcik) {
        OX += 77 * S; OY -= 47 * S;
        float k = yum(0, 0.25f, u), zy = 2 * std::sin((float)t * 2.2f);
        sekil(1318, 372 + zy, 1522, 446 + zy, [&](float x, float y) { return uKutu(x, y, 1420, 404 + zy, 96 * k, 30 * k, 14); }, [&](float, float, float d) { return d > -2.2f ? rgb(44, 26, 60) : rgb(255, 252, 244); });
        const float kuy[3][2] = {{1486, 430 + zy}, {1506, 432 + zy}, {1524, 452 + zy}}; cokgen(kuy, 3, [&](float, float, float) { return rgb(255, 252, 244); });
        if (k > 0.9f) { if (yaziVar[2]) yaziBas(2, 1420, 404 + zy, 88, 22, 44, 26, 60); else { notaCiz(1404, 414 + zy, 0.9f, MENEKSE, -0.3f); notaCiz(1436, 410 + zy, 0.7f, TURKUAZ, -0.3f); } }
        OX -= 77 * S; OY += 47 * S;
    } else if (adamDurum == 2) {
        float d = kis(u / 0.7f, 0, 1), px = kar(1180, 1300, d), py = 538 - 4 * 46 * d * (1 - d);
        elips(1330, 541, 36, 7.5f, rgb(20, 16, 26)); elips(1330, 540, 34, 6.6f, rgb(46, 40, 54)); elips(1330, 540, 11, 2.2f, plakRenk);
        { float a = (float)t * 3.2f; kapsul(1330, 540, 1330 + 30 * std::cos(a), 540 + 5.6f * std::sin(a), 1, 0.4f, rgb(150, 144, 160, 0.7f)); }
        para(px, py - 9, 9);
        for (int i = 0; i < 3; i++) { float f = kes((float)t * 0.9f - i * 0.18f); daire(1330 + i * 22, 486 - 6 * std::sin(f * PI), 4.5f, rgb(255, 250, 235, 0.55f + 0.45f * std::sin(f * PI))); }
    } else if (adamDurum == 5) {
        if (u >= 3.0f) { const float px = 1304 - ADX, py = 432; elips(px, py, 30, 5.4f, rgb(20, 16, 26)); elips(px, py - 0.6f, 28, 4.6f, rgb(46, 40, 54)); elips(px, py - 0.6f, 9, 1.6f, plakYeni); }
    } else if (adamDurum == 3 || adamDurum == 4) {
        float k = yum(0, 0.3f, u), zr = 26 * (0.6f + 0.4f * k) * (1 + 0.06f * std::sin((float)t * 5));
        R zemin = adamDurum == 3 ? YESIL : KEHRIBAR;
        daire(1330, 470, zr + 3, rgb(255, 252, 244)); daire(1330, 470, zr, zemin);
        if (adamDurum == 3) { kapsul(1340, 471, 1348, 480, 3.4f, 3.4f, rgb(255, 255, 255)); kapsul(1348, 480, 1366, 460, 3.4f, 3.4f, rgb(255, 255, 255)); para(1300, 529, 9); }
        else { kapsul(1342, 460, 1362, 480, 3.4f, 3.4f, rgb(255, 255, 255)); kapsul(1362, 460, 1342, 480, 3.4f, 3.4f, rgb(255, 255, 255));
               float d = kis((u - 0.4f) / 0.9f, 0, 1); if (d < 1) para(kar(1300, 1150, d), 529 - 4 * 40 * d * (1 - d), 9); }
    }
}

static void bolme(float xu, float xy) {
    const float k = 0.55f, yon = xy > xu ? 1.f : -1.f, gen = std::fabs(xy - xu);
#ifdef YENI_USLUP
    static const R cam[8] = {rgb(226, 160, 74), rgb(206, 128, 46), rgb(98, 172, 162), rgb(62, 142, 136), rgb(236, 222, 196), rgb(218, 196, 164), rgb(240, 196, 120), rgb(140, 196, 186)};
#else
    static const R cam[8] = {rgb(214, 48, 44), rgb(232, 150, 24), rgb(240, 206, 60), rgb(40, 110, 214), rgb(36, 160, 70), rgb(20, 170, 170), rgb(140, 60, 200), rgb(226, 232, 236)};
#endif
    const float dort[4][2] = {{xu, -100}, {xy, -100 - gen * k}, {xy, 700 + gen * k}, {xu, 700}};
    cokgen(dort, 4, [&](float x, float y, float) {
        float u = (x - xu) * yon / gen, ust = -100 - u * gen * k, alt = 700 + u * gen * k, v = (y - ust) / (alt - ust);
        R c = kar(rgb(30, 78, 84), rgb(20, 54, 64), u);
        if (v > 0.645f) { c = kar(rgb(112, 66, 44), rgb(74, 42, 34), kis((v - 0.645f) / 0.355f, 0, 1)); if (kes(u * 9) < 0.06f) c = rgb(58, 32, 28); }
        if (v > 0.625f && v <= 0.645f) c = kar(rgb(214, 158, 96), rgb(150, 96, 54), (v - 0.625f) / 0.02f);
        if (u > 0.04f && u < 0.70f && v > 0.13f && v < 0.625f) {
            float cu = (u - 0.04f) / 0.66f * 5, cv = (v - 0.13f) / 0.495f * 6; int iu = (int)cu, iv = (int)cv; float fu = cu - iu, fv = cv - iv;
            float e = fu < 1 - fu ? fu : 1 - fu, e2 = fv < 1 - fv ? fv : 1 - fv; if (e2 < e) e = e2;
            if (e < 0.055f) c = rgb(52, 44, 52);
            else { float h = sac(iu * 7 + iv * 13 + 3); R g = cam[(int)(sac(iu * 31 + iv * 17 + 5) * 7.99f)];
                float dalga = 0.5f + 0.5f * std::sin(fu * 7.5f + std::sin(fv * 8 + h * 20) * 1.6f + h * 9) * std::cos(fv * 5.5f + std::sin(fu * 6 + h * 11) * 1.2f);
                float isik = 0.58f + 0.42f * dalga + 0.30f * yum(0.20f, 0.07f, e);
                c = R{g.r * isik + 0.10f, g.g * isik + 0.09f, g.b * isik + 0.07f, 1}; }
        }
        if (u > 0.30f && u < 0.52f && v > 0.555f && v < 0.66f) {
            c = kar(rgb(250, 214, 150), rgb(120, 70, 44), kis(uz((u - 0.41f) / 0.11f, (v - 0.60f) / 0.05f), 0, 1));
            if (v > 0.642f) c = rgb(190, 128, 70); if (u < 0.31f || u > 0.51f || v < 0.563f) c = rgb(60, 34, 28);
        }
        if (u > 0.745f && u < 0.975f && v > 0.30f) {
            c = kar(rgb(140, 84, 52), rgb(96, 54, 38), kis((v - 0.3f) / 0.7f, 0, 1));
            if (u < 0.757f || u > 0.963f || v < 0.312f) c = rgb(60, 34, 28);
            float pm = uz((u - 0.86f) / 0.055f, (v - 0.43f) / 0.07f); if (pm < 1) c = pm > 0.86f ? altin(0.55f) : kar(rgb(255, 214, 130), rgb(214, 130, 50), pm);
            if (uz((u - 0.775f) * gen, (v - 0.68f) * 800) < 7) c = altin(0.8f);
        }
        return c; });

    float a = xy < xy + yon * 26 ? xy : xy + yon * 26;
    sekil(a, -400, a + 26, 1300, [&](float x, float y) { return uKutu(x, y, a + 13, 450, 13, 850, 0); }, [&](float x, float, float) { return kar(rgb(96, 132, 130), rgb(60, 92, 96), kis(std::fabs(x - xy) / 26, 0, 1)); });
    float b0 = yon > 0 ? xy + 26 : xy - 26 - 1400;
    sekil(b0, -400, b0 + 1400, 1300, [&](float x, float y) { return uKutu(x, y, b0 + 700, 450, 700, 850, 0); }, [&](float, float, float) { return rgb(10, 8, 16); });
}

static const float YKU0 = 0.757f, YKU1 = 0.963f, YKV = 0.312f;
static void yanKapiNokta(float u, float v, float& x, float& y) {
    const float xu = sahneNo == 0 ? 1185.f : 1400.f, yon = sahneNo == 0 ? 1.f : -1.f, gen = 235, k = 0.55f; float ust = -100 - u * gen * k, alt = 700 + u * gen * k;
    x = xu + yon * u * gen; y = ust + v * (alt - ust);
}
static void yanKapiCiz() {
    const float a = yanAc; if (a < 0.01f) return;
    const float dis = sahneNo == 0 ? -1.f : 1.f;
    float hx, hy0, hy1, sx, sy0, sy1;
    yanKapiNokta(YKU0, YKV, hx, hy0); yanKapiNokta(YKU0, 1, hx, hy1); yanKapiNokta(YKU1, YKV, sx, sy0); yanKapiNokta(YKU1, 1, sx, sy1);
    const float ar[4][2] = {{sx, sy0}, {hx, hy0}, {hx, hy1}, {sx, sy1}};
    cokgen(ar, 4, [&](float x, float y, float) { float m = uz((x - (sx + hx) * 0.5f) / 46, (y - 480) / 360); return kar(rgb(255, 232, 170), rgb(206, 126, 60), kis(m, 0, 1)); });
    { const float is[4][2] = {{sx, sy1}, {hx, hy1}, {hx + 170 * a * dis, hy1 + 70 * a}, {sx + 50 * a * dis, sy1 + 110 * a}};
      cokgen(is, 4, [&](float, float y, float) { return rgb(255, 214, 140, 0.32f * a * kis(1 - (y - hy1) / (110 * a + 1), 0, 1)); }); }
    float fx = kar(sx, hx + 96 * dis, a), fy0 = kar(sy0, sy0 - 46, a), fy1 = kar(sy1, sy1 + 58, a);
    const float kn[4][2] = {{hx, hy0}, {fx, fy0}, {fx, fy1}, {hx, hy1}};
    const float sol = fx < hx ? fx : hx, gen = std::fabs(fx - hx) + 0.001f, gol = 1 - 0.28f * a;
    cokgen(kn, 4, [&](float x, float y, float d) {
        float u = (x - sol) / gen, yt = kar(hy0, fy0, fx > hx ? u : 1 - u), yb = kar(hy1, fy1, fx > hx ? u : 1 - u), v = (y - yt) / (yb - yt + 0.001f);
        R c = kar(rgb(140, 84, 52), rgb(96, 54, 38), kis(v, 0, 1));
        if (d > -2.5f) c = rgb(60, 34, 28);
        float pu = std::fabs(u - 0.5f), p1 = std::fabs(v - 0.30f), p2 = std::fabs(v - 0.72f);
        if ((pu < 0.36f && pu > 0.32f && (p1 < 0.16f || p2 < 0.18f)) || (pu < 0.36f && (std::fabs(p1 - 0.16f) < 0.007f || std::fabs(p2 - 0.18f) < 0.007f))) c = rgb(74, 40, 30);
        c.r *= gol; c.g *= gol; c.b *= gol; return c; });
    if (gen > 14) { float kx = kar(hx, fx, 0.86f), ky = kar(kar(hy0, fy0, 0.86f), kar(hy1, fy1, 0.86f), 0.56f); daire(kx, ky, 6.5f, altin(0.35f)); daire(kx - 1.4f, ky - 1.4f, 3.9f, altin(0.9f)); }
}

static void noktaYazi(const char* m, float cx, float cy, float nb, R renk) {
    static const uint8_t F[26][7] = {{0x0E,0x11,0x11,0x1F,0x11,0x11,0x11},{0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E},{0x0E,0x11,0x10,0x10,0x10,0x11,0x0E},{0x1E,0x11,0x11,0x11,0x11,0x11,0x1E},
        {0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F},{0x1F,0x10,0x10,0x1E,0x10,0x10,0x10},{0x0E,0x11,0x10,0x17,0x11,0x11,0x0F},{0x11,0x11,0x11,0x1F,0x11,0x11,0x11},{0x0E,0x04,0x04,0x04,0x04,0x04,0x0E},
        {0x07,0x02,0x02,0x02,0x02,0x12,0x0C},{0x11,0x12,0x14,0x18,0x14,0x12,0x11},{0x10,0x10,0x10,0x10,0x10,0x10,0x1F},{0x11,0x1B,0x15,0x15,0x11,0x11,0x11},{0x11,0x19,0x15,0x13,0x11,0x11,0x11},
        {0x0E,0x11,0x11,0x11,0x11,0x11,0x0E},{0x1E,0x11,0x11,0x1E,0x10,0x10,0x10},{0x0E,0x11,0x11,0x11,0x15,0x12,0x0D},{0x1E,0x11,0x11,0x1E,0x14,0x12,0x11},{0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E},
        {0x1F,0x04,0x04,0x04,0x04,0x04,0x04},{0x11,0x11,0x11,0x11,0x11,0x11,0x0E},{0x11,0x11,0x11,0x11,0x11,0x0A,0x04},{0x11,0x11,0x11,0x15,0x15,0x1B,0x11},{0x11,0x11,0x0A,0x04,0x0A,0x11,0x11},
        {0x11,0x11,0x0A,0x04,0x04,0x04,0x04},{0x1F,0x01,0x02,0x04,0x08,0x10,0x1F}};
    int n = (int)std::strlen(m); float x0 = cx - (n * 6 - 1) * nb / 2, y0 = cy - 3.5f * nb;
    for (int i = 0; i < n; i++) { if (m[i] < 'A' || m[i] > 'Z') continue; const uint8_t* g = F[m[i] - 'A'];
        for (int r = 0; r < 7; r++) for (int cc = 0; cc < 5; cc++) if (g[r] & (0x10 >> cc)) { float px = x0 + (i * 6 + cc + 0.5f) * nb, py = y0 + (r + 0.5f) * nb;
            sekil(px - nb * 0.6f, py - nb * 0.6f, px + nb * 0.6f, py + nb * 0.6f, [&](float x, float y) { return uKutu(x, y, px, py, nb * 0.52f, nb * 0.52f, nb * 0.18f); }, [&](float, float, float) { return renk; }); } }
}

static const float KPX[2] = {330, 1350}, KPG = 180, KPU = 330, KPA = 700, PNX = 930, PNY = 405, PNW = 300, PNH = 165;
static void bekleme() {
    float is = 1 / S;
    for (int py = 0; py < H; py++) {
        float vy = (py + 0.5f - OY) * is; uint8_t* p = T + 4 * py * W;
        for (int px = 0; px < W; px++, p += 4) {
            float vx = (px + 0.5f - OX) * is; R c;
            if (vy < 690) {
                c = kar(rgb(16, 40, 58), rgb(34, 88, 94), kis(vy / 690, 0, 1));
                float isik = std::exp(-uz(vx - 420, (vy - 250) * 1.2f) / 230.f) * 0.34f + std::exp(-uz(vx - 1440, (vy - 250) * 1.2f) / 230.f) * 0.34f + std::exp(-uz(vx - 930, (vy - 380) * 1.3f) / 420.f) * 0.18f;
                c.r += isik * 0.95f; c.g += isik * 0.72f; c.b += isik * 0.36f;
                float pn = std::fabs(kes(vx / 205.f) - 0.5f) * 205; if (pn > 100.5f) { c.r *= 0.82f; c.g *= 0.82f; c.b *= 0.82f; }
#ifdef YENI_SALON
                if (vy > 598) {
                    c = kar(rgb(116, 70, 46), rgb(72, 40, 32), kis((vy - 610) / 80, 0, 1));
                    if (kes(vx / 46.f) < 0.05f) { c.r *= 0.72f; c.g *= 0.72f; c.b *= 0.72f; }
                    c.r += isik * 0.55f; c.g += isik * 0.38f; c.b += isik * 0.18f;
                    if (vy < 611) c = kar(rgb(220, 166, 104), rgb(146, 92, 52), kis((vy - 598) / 13, 0, 1));
                }
#endif
            } else if (vy < 714) c = kar(rgb(74, 40, 96), rgb(40, 20, 58), (vy - 690) / 24);
            else {
                float d = (vy - 714) / 240; c = kar(rgb(150, 84, 62), rgb(84, 42, 44), kis(d, 0, 1));
                float sira = std::log(1 + (vy - 714) / 18) * 3.2f, f = kes(sira); if (f < 0.045f) { c.r *= 0.7f; c.g *= 0.7f; c.b *= 0.7f; }
                float kay = (vx - 930) / (1 + (vy - 714) / 160) + 37 * std::floor(sira); if (std::fabs(kes(kay / 260.f) - 0.5f) > 0.492f) { c.r *= 0.78f; c.g *= 0.78f; c.b *= 0.78f; }
#ifdef YENI_SALON
                {
                    const float yg = 150 + (vy - 714) * 1.05f, t = std::fabs(vx - 930) / yg;
                    if (t < 1) {
                        R h = kar(rgb(82, 46, 128), rgb(50, 26, 80), kis((vy - 714) / 260, 0, 1));
                        float desen = std::fabs(kes((vx - 930) / (yg * 0.36f) + kes((vy - 714) / (14 + (vy - 714) * 0.12f)) * 0.5f) - 0.5f);
                        if (desen < 0.05f && t < 0.8f) h = kar(h, rgb(116, 72, 168), 0.4f);
                        if (t > 0.94f) h = rgb(40, 18, 64); else if (t > 0.86f) h = kar(rgb(186, 104, 16), rgb(130, 70, 10), kis((vy - 714) / 260, 0, 1));
                        c = h;
                    }
                    const float lp = std::exp(-uz((vx - 420) / 1.7f, (vy - 726) * 2.4f) / 110.f) * 0.16f + std::exp(-uz((vx - 1440) / 1.7f, (vy - 726) * 2.4f) / 110.f) * 0.16f;
                    c.r += lp; c.g += lp * 0.7f; c.b += lp * 0.35f;
                }
#endif
            }
            p[0] = (uint8_t)(kis(c.r, 0, 1) * 255); p[1] = (uint8_t)(kis(c.g, 0, 1) * 255); p[2] = (uint8_t)(kis(c.b, 0, 1) * 255); p[3] = 255;
        }
    }
    for (int k = 0; k < 2; k++) {
        float x0 = KPX[k], cx = x0 + KPG / 2;
#ifdef YENI_SALON
        sekil(x0 - 16, KPU - 16, x0 + KPG + 16, KPA, [&](float x, float y) { return uKutu(x, y, cx, (KPU - 16 + KPA) / 2, KPG / 2 + 16, (KPA - KPU + 16) / 2, 3); },
              [&](float x, float, float d) { if (d > -3) return rgb(46, 26, 24); if (d > -6) return rgb(176, 112, 70); return kar(rgb(122, 72, 46), rgb(80, 44, 34), kis(std::fabs(x - cx) / (KPG / 2 + 16), 0, 1)); });
        sekil(x0 - 32, KPU - 24, x0 + KPG + 32, KPU - 6, [&](float x, float y) { return uKutu(x, y, cx, KPU - 15, KPG / 2 + 30, 8, 2); },
              [&](float, float y, float d) { if (d > -1.6f) return rgb(64, 34, 26); return kar(rgb(226, 172, 108), rgb(132, 80, 46), kis((y - (KPU - 24)) / 18, 0, 1)); });
        sekil(x0 - 26, KPU - 6, x0 + KPG + 26, KPU + 6, [&](float x, float y) { return uKutu(x, y, cx, KPU, KPG / 2 + 24, 6, 0); }, [&](float, float y, float) { return rgb(8, 4, 16, 0.28f * kis(1 - (y - (KPU - 6)) / 12, 0, 1)); });
#else
        sekil(x0 - 16, KPU - 16, x0 + KPG + 16, KPA, [&](float x, float y) { return uKutu(x, y, cx, (KPU - 16 + KPA) / 2, KPG / 2 + 16, (KPA - KPU + 16) / 2, 3); },
              [&](float x, float, float d) { return d > -3 ? rgb(46, 26, 24) : kar(rgb(104, 60, 40), rgb(70, 38, 32), kis(std::fabs(x - cx) / (KPG / 2 + 16), 0, 1)); });
#endif
        sekil(x0, KPU, x0 + KPG, KPA, [&](float x, float y) { return uKutu(x, y, cx, (KPU + KPA) / 2, KPG / 2, (KPA - KPU) / 2, 1); },
              [&](float x, float y, float) { float m = uz((x - cx) / 120, (y - 480) / 260); return kar(rgb(255, 232, 170), rgb(206, 126, 60), kis(m, 0, 1)); });
        sekil(cx - 96, 262, cx + 96, 306, [&](float x, float y) { return uKutu(x, y, cx, 284, 92, 19, 9); }, [&](float, float y, float d) { return d > -2.4f ? altin(0.35f) : altin(0.5f + 0.35f * kis(1 - (y - 268) / 32, 0, 1)); });
        if (!yaziVar[3 + k]) noktaYazi(k == 0 ? "GRAMOFON" : "KAYIT", cx, 284, 3.3f, rgb(60, 30, 84));

        sekil(cx - 60, 230, cx + 60, 300, [&](float x, float y) { return uElips(x, y, cx, 234, 58, 62); }, [&](float, float, float d) { return rgb(255, 220, 150, 0.16f * kis(-d / 50, 0, 1)); });
        sekil(cx - 8, 234, cx + 8, 258, [&](float x, float y) { return uElips(x, y, cx, 246, 6.5f, 10); }, [&](float, float y, float d) { return d > -1.5f ? altin(0.28f) : altin(0.42f + 0.3f * kis((256 - y) / 20, 0, 1)); });
        kapsul(cx, 244, cx, 229, 2.2f, 1.8f, altin(0.55f));
        { const float ab[4][2] = {{cx - 15, 198}, {cx + 15, 198}, {cx + 25, 231}, {cx - 25, 231}};
          cokgen(ab, 4, [&](float x, float y, float d) { float v = kis((y - 198) / 33, 0, 1), u = (x - cx) / (15 + 10 * v);
              R c = kar(rgb(238, 214, 170), rgb(255, 242, 212), v * v); c = kar(c, rgb(178, 140, 92), 0.30f * u * u);
              if (d > -1.4f) c = kar(c, rgb(140, 100, 58), 0.65f); return c; }); }
        elips(cx, 231, 24, 3, rgb(255, 238, 196));
    }

    sekil(PNX - PNW - 14, PNY - PNH - 14, PNX + PNW + 14, PNY + PNH + 14, [&](float x, float y) { return uKutu(x, y, PNX, PNY, PNW + 12, PNH + 12, 12); },
          [&](float x, float y, float d) {
#ifdef YENI_USLUP
              if (d > -12) { float t2 = 1 - std::fabs((d + 6) / 6); if (std::fabs(d + 10.5f) < 0.9f) return altin(0.6f); R w = kar(rgb(66, 36, 24), rgb(132, 80, 48), 0.25f + 0.6f * t2); float dm = 0.06f * std::sin(x * 0.9f + std::sin(y * 0.11f) * 3); w.r += dm; w.g += dm * 0.6f; w.b += dm * 0.3f; return w; }
#else
              if (d > -12) return altin(0.30f + 0.55f * (1 - std::fabs((d + 6) / 6)) + 0.05f * std::sin((x + y) * 0.08f));
#endif
              R c = kar(rgb(26, 70, 60), rgb(14, 44, 40), kis((y - (PNY - PNH)) / (2 * PNH), 0, 1));
              if (y < PNY - PNH + 52) c = kar(c, rgb(46, 104, 90), 0.55f);
              if (std::fabs(y - (PNY - PNH + 52)) < 1.3f) c = altin(0.6f);
              if (std::fabs(y - (PNY - PNH + 56 + 5 * 45.5f)) < 1.1f) c = altin(0.55f);
              if (y > PNY - PNH + 56 + 5 * 45.5f + 1.1f) c = kar(c, rgb(46, 104, 90), 0.35f);
              return c; });

    kapsul(790, 668, 790, 700, 5, 5, altin(0.45f)); kapsul(1070, 668, 1070, 700, 5, 5, altin(0.45f));
    sekil(748, 640, 1112, 674, [&](float x, float y) { return uKutu(x, y, 930, 657, 180, 14, 9); }, [&](float, float y, float) { return kar(rgb(104, 56, 142), rgb(60, 30, 88), kis((y - 644) / 28, 0, 1)); });
    sekil(748, 720, 1112, 744, [&](float x, float y) { return uElips(x, y, 930, 708, 200, 16); }, [&](float, float, float d) { return rgb(8, 4, 20, 0.30f * kis(-d / 12, 0, 1)); });
}
static void salonSahnesi(double t) {
    if (tazele) { tazele = false; kizTazele = true; T = A; bekleme(); karart(); T = CIK; }
    std::memcpy(CIK, A, (size_t)W * H * 4);
    double dt = salonSon < 0 ? 0 : t - salonSon; if (dt < 0 || dt > 0.25) dt = 0; salonSon = t;
    for (int k = 0; k < 2; k++) {
        kapiAc[k] += (kapiHedef[k] - kapiAc[k]) * (float)(1 - std::exp(-dt * 4.0)); float a = kapiAc[k];
        float mx = k == 0 ? KPX[k] : KPX[k] + KPG, yon = k == 0 ? 1.f : -1.f, ux = mx + yon * KPG * (1 - 0.74f * a), e = 16 * a;
        if (a > 0.02f) { const float is[4][2] = {{KPX[k], KPA}, {KPX[k] + KPG, KPA}, {KPX[k] + KPG + 70 + 90 * a, KPA + 150}, {KPX[k] - 70 - 90 * a, KPA + 150}};
            cokgen(is, 4, [&](float, float y, float) { return rgb(255, 214, 140, 0.34f * a * kis(1 - (y - KPA) / 150, 0, 1)); }); }
        const float kn[4][2] = {{mx, KPU}, {ux, KPU + e}, {ux, KPA + e * 0.6f}, {mx, KPA}};
        float sol = mx < ux ? mx : ux, gen = std::fabs(ux - mx);
#ifdef YENI_SALON
        cokgen(kn, 4, [&](float x, float y, float d) {
            float u = (x - sol) / gen, v = (y - KPU) / (KPA - KPU); R c = kar(rgb(150, 90, 56), rgb(96, 54, 36), kis(v * 0.7f + (k == 0 ? u : 1 - u) * 0.3f * a, 0, 1));
            float damar = 0.016f * std::sin(u * 38 + std::sin(v * 7 + k * 2) * 1.6f) + 0.008f * std::sin(v * 120 + u * 4);
            c.r += damar; c.g += damar * 0.7f; c.b += damar * 0.45f;
            if (d > -2.5f) return rgb(64, 34, 26);
            const float pu = std::fabs(u - 0.5f);
            for (int pi = 0; pi < 2; pi++) {
                const float pv = pi == 0 ? 0.27f : 0.70f, ph = pi == 0 ? 0.17f : 0.20f, dv = v - pv;
                if (pu < 0.34f && std::fabs(dv) < ph + 0.03f) {
                    const float ku = 0.34f - pu, kv = ph + 0.03f - std::fabs(dv);
                    if (ku < 0.035f || kv < 0.035f) { const bool isik = (kv < 0.035f && dv < 0) || (ku < 0.035f && u < 0.5f); c = kar(c, isik ? rgb(222, 168, 116) : rgb(46, 24, 18), 0.42f); }
                    else { c.r *= 0.9f; c.g *= 0.9f; c.b *= 0.9f; }
                }
            }
            if (v > 0.9f && v < 0.975f && pu < 0.42f) c = altin(0.40f + 0.32f * (1 - (v - 0.9f) / 0.075f));
            return c; });
#else
        cokgen(kn, 4, [&](float x, float y, float d) {
            float u = (x - sol) / gen, v = (y - KPU) / (KPA - KPU); R c = kar(rgb(140, 84, 52), rgb(98, 56, 38), kis(v * 0.7f + (k == 0 ? u : 1 - u) * 0.3f * a, 0, 1));
            if (d > -2.5f) c = rgb(70, 38, 30);
            float pu = std::fabs(u - 0.5f), p1 = std::fabs(v - 0.27f), p2 = std::fabs(v - 0.70f);
            if ((pu < 0.34f && pu > 0.31f && (p1 < 0.17f || p2 < 0.20f)) || (pu < 0.34f && (std::fabs(p1 - 0.17f) < 0.008f || std::fabs(p2 - 0.20f) < 0.008f))) c = rgb(74, 40, 30);
            return c; });
#endif
#ifdef YENI_SALON
        for (int m = 0; m < 2; m++) { const float hy = KPU + (KPA - KPU) * (m ? 0.82f : 0.16f); kapsul(mx + yon * 3, hy - 11, mx + yon * 3, hy + 11, 3.2f, 3.2f, altin(0.32f)); }
#endif
        float kx = mx + yon * gen * 0.86f; daire(kx, 528 + e * 0.5f, 7, altin(0.35f)); daire(kx - 1.5f, 526.5f + e * 0.5f, 4.2f, altin(0.9f));
    }

    for (int k = 0; k < 2; k++) yaziBas(3 + k, KPX[k] + KPG / 2, 284, 60, 15, 60, 30, 84);
    if (panoVar[6]) bitBas(panoBit[6], 512, 48, PNX, PNY - PNH + 27, 235, 22, 252, 236, 190);
    else { notaCiz(PNX - 14, PNY - PNH + 36, 0.8f, rgb(252, 236, 190), -0.3f); notaCiz(PNX + 18, PNY - PNH + 32, 0.62f, rgb(252, 236, 190), -0.3f); }

    int sira[5], ns = 0; for (int i = 0; i < 5; i++) if (panoDurum[i] >= 0 || panoVar[i]) sira[ns++] = i;
    const float sy0 = PNY - PNH + 56, srh = ns ? 5 * 45.5f / ns : 45.5f;
    for (int j = 1; j < ns; j++) { const float ly = sy0 + j * srh;
        sekil(PNX - PNW + 6, ly - 1.5f, PNX + PNW - 6, ly + 1.5f, [&](float x, float y) { return uKutu(x, y, PNX, ly, PNW - 6, 0.7f, 0); }, [&](float, float, float) { return rgb(120, 170, 150, 0.35f); }); }
    for (int j = 0; j < ns; j++) {
        const int i = sira[j];
        float cy = sy0 + (j + 0.5f) * srh, ix = PNX + PNW - 34;
        if (panoVar[i]) bitBas(panoBit[i], 512, 48, PNX - 44, cy, 240, 22.5f, 246, 240, 226);
        else kapsul(PNX - PNW + 26, cy, PNX + 60 - 30 * (i % 3), cy, 4, 4, rgb(246, 240, 226, 0.55f));
        if (panoDurum[i] == 1) { daire(ix, cy, 15, YESIL); kapsul(ix - 7, cy + 0.5f, ix - 2, cy + 6, 2.3f, 2.3f, rgb(255, 255, 255)); kapsul(ix - 2, cy + 6, ix + 8, cy - 6, 2.3f, 2.3f, rgb(255, 255, 255)); }
        else if (panoDurum[i] == 2) { daire(ix, cy, 15, KEHRIBAR); kapsul(ix - 6, cy - 6, ix + 6, cy + 6, 2.3f, 2.3f, rgb(255, 255, 255)); kapsul(ix + 6, cy - 6, ix - 6, cy + 6, 2.3f, 2.3f, rgb(255, 255, 255)); }
        else if (panoDurum[i] == 0) for (int n = 0; n < 3; n++) { float f = kes((float)t * 0.9f - n * 0.18f - i * 0.07f); daire(ix - 13 + n * 13, cy - 4 * std::sin(f * PI), 3.6f, rgb(252, 236, 190, 0.5f + 0.5f * std::sin(f * PI))); }
    }

    { float cx = PNX, cy = 172; daire(cx, cy, 39, altin(0.42f)); daire(cx, cy, 34, rgb(250, 244, 228)); for (int n = 0; n < 12; n++) { float a = n * PI / 6; daire(cx + 28 * std::sin(a), cy - 28 * std::cos(a), n % 3 ? 1.3f : 2.2f, rgb(70, 50, 60)); }
      double gs = saatFark >= 0 ? std::fmod(saatFark + t, 86400.0) : -1;
      float am = gs >= 0 ? (float)(std::fmod(gs, 3600.0) / 3600.0 * 6.2832) : (float)t * 0.105f;
      float ah = gs >= 0 ? (float)(std::fmod(gs, 43200.0) / 43200.0 * 6.2832) : am / 12 + 1.1f; kapsul(cx, cy, cx + 15 * std::sin(ah), cy - 15 * std::cos(ah), 2.4f, 1.6f, rgb(50, 30, 44)); kapsul(cx, cy, cx + 25 * std::sin(am), cy - 25 * std::cos(am), 1.8f, 1.1f, rgb(50, 30, 44));
      float as = gs >= 0 ? (float)(std::fmod(gs, 60.0) / 60.0 * 6.2832) : (float)t * 6.2832f / 60; kapsul(cx, cy, cx + 27 * std::sin(as), cy - 27 * std::cos(as), 0.9f, 0.6f, KEHRIBAR); daire(cx, cy, 3, altin(0.8f)); }
}

static void solDuvar() {

    const float gen = SDU - SDY, EK = 760, uc = SDY - EK, ue = (SDU - uc) / gen;
    const float dort[4][2] = {{uc, -100 - ue * gen * SDK}, {SDU, -100}, {SDU, TABAN}, {uc, TABAN + ue * gen * SDK}};
    cokgen(dort, 4, [&](float x, float y, float) {
        float u = (SDU - x) / gen, ust = -100 - u * gen * SDK, alt = TABAN + u * gen * SDK, v = (y - ust) / (alt - ust);
        R c = kar(rgb(30, 78, 86), rgb(18, 50, 62), u < 1 ? u : 1 + (u - 1) * 0.18f);
        float isik = std::exp(-u * 2.2f) * 0.10f * (1 - v * 0.6f); c.r += isik; c.g += isik * 0.5f; c.b += isik * 0.3f;
        if (kes(u * 3 + 0.02f) < 0.022f) { c.r *= 0.80f; c.g *= 0.80f; c.b *= 0.80f; }
        if (v > 1 - 18.f / 740) c = kar(rgb(70, 38, 84), rgb(36, 18, 50), kis((v - (1 - 18.f / 740)) / (18.f / 740), 0, 1));
        return c; });
    sekil(uc - 26, -900, uc, 1700, [&](float x, float y) { return uKutu(x, y, uc - 13, 400, 13, 1300, 0); }, [&](float x, float, float) { return kar(rgb(60, 92, 96), rgb(96, 132, 130), kis((x - (uc - 26)) / 26, 0, 1)); });
    sekil(uc - 1426, -900, uc - 26, 1700, [&](float x, float y) { return uKutu(x, y, uc - 726, 400, 700, 1300, 0); }, [&](float, float, float) { return rgb(10, 8, 16); });
    { const float gz[4][2] = {{SDU, TABAN}, {SDU + 70, TABAN}, {SDY + 90, TABAN + gen * SDK}, {SDY, TABAN + gen * SDK}};
      cokgen(gz, 4, [&](float x, float y, float) { float u = (y - TABAN) / (gen * SDK), sx = SDU - u * gen; return rgb(8, 4, 20, 0.30f * kis(1 - (x - sx) / (70 + 20 * u), 0, 1)); }); }
}

static void panelCiz() {
    float k = panelAnim * panelAnim * (3 - 2 * panelAnim);
    const float gen = SDU - SDY;
    auto dv = [&](float u, float v, float& px, float& py) { float ust = -100 - u * gen * SDK, alt = TABAN + u * gen * SDK; px = (SDU - u * gen) * S + OX; py = (ust + v * (alt - ust)) * S + OY; };
    float wxl, wytl, wybl, wxr, wytr, wybr, tmp; dv(PU1, PV0, wxl, wytl); dv(PU1, PV1, tmp, wybl); dv(PU0, PV0, wxr, wytr); dv(PU0, PV1, tmp, wybr);
    float fx0 = PNL_X * W, fx1 = fx0 + PNL_W * W, fy0 = PNL_Y * H, fy1 = fy0 + PNL_H * H;
    float xl = kar(wxl, fx0, k), xr = kar(wxr, fx1, k), ytl = kar(wytl, fy0, k), ybl = kar(wybl, fy1, k), ytr = kar(wytr, fy0, k), ybr = kar(wybr, fy1, k);
    float ymin = ytl < ytr ? ytl : ytr, ymax = ybl > ybr ? ybl : ybr;
    panelKutu[0] = xl / W; panelKutu[1] = ymin / H; panelKutu[2] = (xr - xl) / W; panelKutu[3] = (ymax - ymin) / H;
    float eS = S, eOX = OX, eOY = OY; S = 1; OX = 0; OY = 0;
    float hort = ((ybl - ytl) + (ybr - ytr)) * 0.5f, c = PNL_C * W * (hort / (PNL_H * H)), gk = kar(0.35f, 1.5f, k), koyu = kar(0.84f, 1.f, k);
    const float FX = 0.052f, FY = FX * (PNL_W * W) / (PNL_H * H);
    { const float g[4][2] = {{xl + c * gk * 0.7f, ytl + c * gk}, {xr + c * gk * 0.7f, ytr + c * gk}, {xr + c * gk * 0.7f, ybr + c * gk}, {xl + c * gk * 0.7f, ybl + c * gk}};
      cokgen(g, 4, [&](float, float, float d) { return rgb(6, 4, 16, kar(0.50f, 0.36f, k) * kis(-d / (c * (0.4f + gk * 0.6f)), 0, 1)); }); }
    if (k < 0.98f) { float a = 1 - k, mx = (xl + xr) / 2, my = (ytl + ytr) / 2 - c * 3.4f;
        R tel = altin(0.5f); tel.a = a; R civi = altin(0.78f); civi.a = a;
        kapsul(kar(xl, xr, 0.24f), kar(ytl, ytr, 0.24f) + c * 0.4f, mx, my, c * 0.14f, c * 0.14f, tel); kapsul(kar(xl, xr, 0.76f), kar(ytl, ytr, 0.76f) + c * 0.4f, mx, my, c * 0.14f, c * 0.14f, tel); daire(mx, my, c * 0.5f, civi); }
    const float pn[4][2] = {{xl, ytl}, {xr, ytr}, {xr, ybr}, {xl, ybl}};
    cokgen(pn, 4, [&](float x, float y, float) {
        float u = (x - xl) / (xr - xl), yt = kar(ytl, ytr, u), yb = kar(ybl, ybr, u), v = (y - yt) / (yb - yt), eu = u < 1 - u ? u : 1 - u, ev = v < 1 - v ? v : 1 - v, e = eu / FX < ev / FY ? eu / FX : ev / FY;
        R kg;
#ifdef YENI_USLUP
        if (e < 1) { float t2 = 1 - std::fabs(e - 0.5f) * 2; kg = e > 0.86f ? altin(0.6f) : kar(rgb(66, 36, 24), rgb(132, 80, 48), 0.25f + 0.6f * t2); float dm = 0.05f * std::sin(u * 90 + std::sin(v * 13) * 3); kg.r += dm; kg.g += dm * 0.6f; kg.b += dm * 0.3f; }
#else
        if (e < 1) { float t2 = 1 - std::fabs(e - 0.5f) * 2; kg = altin(0.30f + 0.55f * t2 + 0.05f * std::sin((u + v) * 40)); }
#endif
        else if (e < 1.09f) kg = rgb(120, 84, 30);
        else {
            kg = kar(rgb(252, 247, 233), rgb(240, 231, 210), kis(v, 0, 1));
            float gol = kis((e - 1) / 1.6f, 0, 1); kg.r *= 0.90f + 0.10f * gol; kg.g *= 0.90f + 0.10f * gol; kg.b *= 0.88f + 0.12f * gol;
            if (k < 0.9f) {
                float sat = (v - 0.20f) / 0.066f, fs = sat - std::floor(sat);
                bool bas = v > 0.075f && v < 0.125f && u > 0.16f && u < 0.84f, satir = v > 0.20f && v < 0.92f && fs > 0.30f && fs < 0.52f && u > 0.13f && u < 0.60f + 0.26f * sac((int)std::floor(sat) * 7 + 2);
                if (bas) kg = kar(kg, rgb(124, 58, 237), 0.55f * (1 - k)); else if (satir) kg = kar(kg, rgb(60, 30, 84), 0.42f * (1 - k));
                if (std::fabs(v - 0.155f) < 0.004f && u > 0.10f && u < 0.90f) kg = kar(kg, rgb(190, 134, 30), 0.8f * (1 - k));
            }
        }
        kg.r *= koyu; kg.g *= koyu; kg.b *= koyu; return kg; });
    S = eS; OX = eOX; OY = eOY;
}

static void panelKoy() {
    const int hal = panelAnim <= 0.f ? 0 : panelAnim >= 1.f ? 1 : -1;
    if (hal < 0 || !P) { pOnbellek = -1; panelCiz(); return; }
    if (pOnbellek != hal) {
        uint8_t* eT = T; T = P; std::memset(P, 0, (size_t)W * H * 4); saydamKip = true; panelCiz(); saydamKip = false; T = eT;
        int ax = W, ay = H, bx = 0, by = 0;
        for (int y = 0; y < H; y++) { const uint8_t* s = P + 4 * (size_t)y * W; for (int x = 0; x < W; x++, s += 4) if (s[3]) { if (x < ax) ax = x; if (x >= bx) bx = x + 1; if (y < ay) ay = y; by = y + 1; } }
        if (bx <= ax) { ax = ay = bx = by = 0; }
        pKutu[0] = ax; pKutu[1] = ay; pKutu[2] = bx; pKutu[3] = by; pOnbellek = hal;
    }
    for (int y = pKutu[1]; y < pKutu[3]; y++) {
        const uint8_t* s = P + 4 * ((size_t)y * W + pKutu[0]); uint8_t* d = T + 4 * ((size_t)y * W + pKutu[0]);
        for (int x = pKutu[0]; x < pKutu[2]; x++, s += 4, d += 4) {
            unsigned sa = s[3]; if (!sa) continue;
            if (sa == 255) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; continue; }
            unsigned ia = 255 - sa;
            d[0] = (uint8_t)((d[0] * ia + 127) / 255 + s[0]); d[1] = (uint8_t)((d[1] * ia + 127) / 255 + s[1]); d[2] = (uint8_t)((d[2] * ia + 127) / 255 + s[2]);
        }
    }
}

static void pazarSahnesi(double t) {
    if (sahneNo == 2) { salonSahnesi(t); return; }
    if (tazele) {
        tazele = false; kizTazele = true; pOnbellek = -1;
        T = A; oda(); if (sahneNo == 1) bolme(1400, 1165); else bolme(1185, 1420); if (sahneNo == 0) solDuvar(); if (sahneNo != 1) { dolap(); kutu(); } karart();
        T = B; std::memset(B, 0, (size_t)W * H * 4); saydamKip = true; boru(); saydamKip = false;
        T = CIK;
    }
    std::memcpy(CIK, A, (size_t)W * H * 4);
    if (sahneNo == 1) { yanKapiCiz(); Yer em = yerAc(ADX, 0, 1); adam(t); adamHikaye(t); yerKapa(em); return; }
    if (sahneNo == 0) yanKapiCiz();
    kapakYazi();
    if (panelAcik && panelAnim < 0.02f) panelKoy();
    if (plakRafta) { elips(1281, 431, 27, 5.6f, rgb(20, 16, 26)); elips(1281, 430.4f, 25, 4.8f, rgb(46, 40, 54)); elips(1281, 430.4f, 8, 1.6f, plakYeni); }
    tablaVePlak();
#ifdef YENI_DOLAP
    kadranIsigi(t);
#endif
    dalgalar(t);
    {
        int ax = (int)(590 * S + OX), ay = (int)(-40 * S + OY), bx = (int)(1175 * S + OX) + 1, by = (int)(410 * S + OY) + 1;
        if (ax < 0) ax = 0; if (ay < 0) ay = 0; if (bx > W) bx = W; if (by > H) by = H;
        for (int y = ay; y < by; y++) {
            const uint8_t* s = B + 4 * (y * W + ax); uint8_t* d = CIK + 4 * (y * W + ax);
            for (int x = ax; x < bx; x++, s += 4, d += 4) {
                unsigned sa = s[3]; if (!sa) continue;
                if (sa == 255) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; continue; }
                unsigned ia = 255 - sa;
                d[0] = (uint8_t)((d[0] * ia + 127) / 255 + s[0]); d[1] = (uint8_t)((d[1] * ia + 127) / 255 + s[1]); d[2] = (uint8_t)((d[2] * ia + 127) / 255 + s[2]);
            }
        }
    }
    kiz(t);
    jeton(t);
    notalar(t);
#ifndef HAVASIZ
    odaHavasi(t);
#endif
    if (panelAcik && panelAnim >= 0.02f && !(panelSagF > 0 && panelAnim > 0.995f)) panelKoy();
}

}

extern "C" {
uint8_t* gr_tampon(int w, int h) {
    using namespace gr;
    if (w != W || h != H || !CIK) {
        std::free(CIK); std::free(A); std::free(B); std::free(P);
        size_t n = (size_t)w * h * 4;
        CIK = (uint8_t*)std::malloc(n); A = (uint8_t*)std::malloc(n); B = (uint8_t*)std::malloc(n); P = (uint8_t*)std::malloc(n);
        W = w; H = h; T = CIK;
    }
    float sx = W / 1420.f, sy = H / 950.f; S = sx < sy ? sx : sy;
    OX = W * 0.5f - 930 * S; OY = H * 0.5f - 435 * S;
    tazele = true; cekim = -1; pOnbellek = -1;
    return CIK;
}
void gr_sahne(int n) { if (n != gr::sahneNo) { gr::sahneNo = n; gr::tazele = true; gr::cekim = -1; } }
void gr_don(float derece) { gr::donDer = derece; gr::kizTazele = true; }

static void kameraKoy(float mx, float my, float z) {
    using namespace gr;
    float sx = W / 1420.f, sy = H / 950.f; float taban = sx < sy ? sx : sy;
    if (mx < 0 || z <= 1.001f) { S = taban; OX = W * 0.5f - 930 * S; OY = H * 0.5f - 435 * S; }
    else { S = taban * z; OX = W * 0.5f - mx * S; OY = H * 0.5f - my * S; }
    tazele = true;
}

static bool darKadraj = false;
static void odaCekimi() {
    using namespace gr;
    if (darKadraj) {
        if (W < 0.8f * H) {
            const float sol = std::fmin(492.f, kizX - 100.f), sag = 1192.f;
            S = std::fmin(W / (sag - sol), H / 900.f); const float E = std::fmax(0.f, H / S - 900);
            OX = W * 0.5f - (sol + sag) * 0.5f * S; OY = H * 0.5f - (425 + 0.1f * E) * S;
        } else if (W < 1.5f * H) {
            S = std::fmin(W / 1180.f, H / 890.f); const float E = std::fmax(0.f, H / S - 890);
            OX = W * 0.5f - 830 * S; OY = H * 0.5f - (400 + 0.15f * E) * S;
        } else {
            S = std::fmin(W / 1525.f, H / 805.f); const float E = std::fmax(0.f, H / S - 805);
            OX = W * 0.5f - 657 * S; OY = H * 0.5f - (392 + 0.15f * E) * S;
            if (panelAcik && sahneNo == 0) { const float sag = ((panelSagF > 0 ? panelSagF : PNL_X + PNL_W) + 0.012f) * W, kizSol = OX + (kizX - 64) * S; if (kizSol < sag) OX += sag - kizSol; }
        }
        tazele = true; return;
    }
    kameraKoy(660, 388, 1.12f);
    if (!panelAcik || sahneNo != 0) return;
    float sag = (PNL_X + PNL_W + 0.012f) * W, kizSol = OX + (kizX - 64) * S;
    if (kizSol < sag) { OX += sag - kizSol; tazele = true; }
}

static void kayitCekimi() {
    using namespace gr;
    if (darKadraj && W < 1.5f * H) { S = std::fmin(W / 840.f, H / 630.f); const float E = std::fmax(0.f, H / S - 630); OX = W * 0.5f - 1595 * S; OY = H * 0.5f - (465 + 0.15f * E) * S; tazele = true; return; }
    float sx = W / 1420.f, sy = H / 950.f, s = (sx < sy ? sx : sy) * 1.72f, mx = 1143 + W * 0.5f / s;
    kameraKoy(mx > 1565 ? mx : 1565, darKadraj ? 484 : 500, 1.72f);
}

static void salonCekimi() {
    using namespace gr;
    if (darKadraj && W < 1.5f * H) { S = std::fmin(W / 1280.f, H / 700.f); const float E = std::fmax(0.f, H / S - 700); OX = W * 0.5f - 930 * S; OY = H * 0.5f - (450 + 0.2f * E) * S; tazele = true; return; }
    kameraKoy(930, 470, 1.22f);
}
void gr_dar(int ac) { bool d = ac != 0; if (d != darKadraj) { darKadraj = d; gr::cekim = -1; gr::tazele = true; } }
void gr_panel_sag(float f) { if (!(f > 0 && f < 0.9f)) f = 0; if (std::fabs(f - gr::panelSagF) > 0.002f) { gr::panelSagF = f; gr::cekim = -1; gr::tazele = true; } }
void gr_kamera(float mx, float my, float z) { if (!gr::CIK) return; gr::otoKamera = false; kameraKoy(mx, my, z); }
void gr_oto(int ac) { gr::otoKamera = ac != 0; gr::cekim = -1; if (!ac && gr::CIK) kameraKoy(-1, -1, 1); }
void gr_jeton_at() { gr::jetonIstek = true; }
int gr_jeton_dustu() { int b = gr::dustuBayrak; gr::dustuBayrak = 0; return b; }
void gr_cal(int ac) { gr::caliyor = ac != 0; }

void gr_tempo(float periyot, float gecen) {
    using namespace gr;
    if (!(periyot > 0.2f && periyot < 2.5f)) return;
    vurusSn = periyot;
    if (gecen < 0) return;
    float hedef = std::fmod(2 * PI * gecen / periyot, 2 * PI), simdiF = std::fmod(ritimFaz, 2 * PI), fark = hedef - simdiF;
    if (fark > PI) fark -= 2 * PI; if (fark < -PI) fark += 2 * PI;
    ritimFaz += fark * 0.35f; if (ritimFaz < 0) ritimFaz += 8 * PI;
}

void gr_yazi(int hangi, const uint8_t* alfa) {
    if (hangi < 0 || hangi > 4) return;
    if (hangi >= 3) gr::tazele = true;
    if (!alfa) { gr::yaziVar[hangi] = false; return; }
    std::memcpy(gr::yaziBit[hangi], alfa, 384 * 96); gr::yaziVar[hangi] = true;
}

void gr_adam(int durum) { if (durum < 0 || durum > 6 || durum == gr::adamDurum) return; gr::adamDurum = durum; gr::adamBas = gr::simdi; }
void gr_balon(int ac) { gr::balonAcik = ac != 0; }
void gr_konus(float saniye) { gr::konusBitis = gr::simdi + (saniye > 0 ? saniye : 0); }
float gr_adam_kafa(int i) { return gr::sahneNo == 1 && i >= 0 && i < 2 ? gr::adamKafa[i] : -1; }

void gr_yan_kapi(int mod) { using namespace gr; if (sahneNo != 1 && sahneNo != 0) return;
    if (mod == 2) { if (gecisMod != 0) return; yanHedef = 1; gecisHedef = sahneNo == 1 ? 0 : 1; gecisMod = 1; gecisBas = simdi; }
    else if (gecisMod == 0) yanHedef = mod == 1 ? 0.22f : 0.f; }
float gr_yan_kapi_kutu(int i) { using namespace gr; if (!CIK || (sahneNo != 1 && sahneNo != 0)) return 0;
    float sx, sy0, sy1, hx, hy0, hy1; yanKapiNokta(YKU1, YKV, sx, sy0); yanKapiNokta(YKU1, 1, sx, sy1); yanKapiNokta(YKU0, YKV, hx, hy0); yanKapiNokta(YKU0, 1, hx, hy1);
    float ax = sx < hx ? sx : hx, bx = sx < hx ? hx : sx;
    float x0 = (ax * S + OX) / W, x1 = (bx * S + OX) / W, y0 = ((sy0 < hy0 ? sy0 : hy0) * S + OY) / H, y1 = ((sy1 > hy1 ? sy1 : hy1) * S + OY) / H;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > 1) x1 = 1; if (y1 > 1) y1 = 1;
    const float v[4] = {x0, y0, x1 - x0, y1 - y0}; return i >= 0 && i < 4 ? v[i] : 0; }

void gr_pano(int satir, const uint8_t* alfa, int durum) {
    if (satir < 0 || satir > 6) return;
    if (alfa) { std::memcpy(gr::panoBit[satir], alfa, 512 * 48); gr::panoVar[satir] = true; } else gr::panoVar[satir] = false;
    if (satir < 6) gr::panoDurum[satir] = durum < -1 || durum > 2 ? -1 : durum;
}
void gr_kapi(int hangi, int acik) { if (hangi == 0 || hangi == 1) gr::kapiHedef[hangi] = acik ? 1.f : 0.f; }

void gr_plak_ver(unsigned rgbRenk) { gr::plakYeni = gr::rgb((rgbRenk >> 16) & 255, (rgbRenk >> 8) & 255, rgbRenk & 255); gr::plakRafta = true; gr::plakIstek = true; }
int gr_plak_kondu() { int b = gr::plakKonduB; gr::plakKonduB = 0; return b; }

void gr_panel(int mod) {
    using namespace gr; if (mod < 0 || mod > 2) return;
    bool a = mod != 0; if (a != panelAcik) { panelAcik = a; tazele = true; cekim = -1; }
    panelMod = mod; if (!a) panelAnim = 0;
}
int gr_panel_anim() { return (int)(gr::panelAnim * 1000 + 0.5f); }
float gr_panel_kutu(int i) { return i >= 0 && i < 4 ? gr::panelKutu[i] : 0; }
void gr_hava(int h) { if (h >= 0 && h <= 2) gr::hava = h; }

void gr_gir(int hangi) { using namespace gr; if (sahneNo != 2 || gecisMod != 0 || hangi < 0 || hangi > 1) return; kapiHedef[hangi] = 1; gecisHedef = hangi == 0 ? 0 : 1; gecisMod = 1; gecisBas = simdi; }
void gr_cik() { using namespace gr; if (sahneNo == 2 || gecisMod != 0) return; gecisHedef = 2; gecisMod = 1; gecisBas = simdi - 0.45; }
void gr_saat(double gunSaniye) { gr::saatFark = gunSaniye - gr::simdi; }
int gr_sahne_no() { return gr::sahneNo; }
int gr_gecis() { return gr::gecisMod; }

float gr_kapi_kutu(int hangi, int i) { using namespace gr; if (hangi < 0 || hangi > 1 || !CIK) return 0;
    float x = (KPX[hangi] * S + OX) / W, y = (KPU * S + OY) / H, w = KPG * S / W, h = (KPA - KPU) * S / H; return i == 0 ? x : i == 1 ? y : i == 2 ? w : h; }

float gr_salon_pano(int i) { using namespace gr; if (!CIK) return 0;
    float x0 = PNX - PNW + 6, x1 = PNX + PNW - 6, y0 = PNY - PNH + 2, y1 = PNY + PNH - 4, ya = PNY - PNH + 56 + 5 * 45.5f + 3;
    float v[8] = {(x0 * S + OX) / W, (y0 * S + OY) / H, (x1 - x0) * S / W, (y1 - y0) * S / H, (x0 * S + OX) / W, (ya * S + OY) / H, (x1 - x0) * S / W, (y1 - ya) * S / H}; return i >= 0 && i < 8 ? v[i] : 0; }
void gr_plak(unsigned rgbRenk) { gr::plakRenk = gr::rgb((rgbRenk >> 16) & 255, (rgbRenk >> 8) & 255, rgbRenk & 255); }
void gr_ciz(double t) {
    using namespace gr;
    if (!CIK) return;
    double dt = onceki < 0 ? 0 : t - onceki; if (dt < 0 || dt > 0.25) dt = 0.25 < dt ? 0.25 : 0; onceki = t; simdi = t;
    if (jetonIstek) { jetonIstek = false;
        if (jetonBas < 0) { kizIs = 1; jetonUcusta = true; jetonBas = t; kizBasX = kizX; { float uzak = KIZHEDEF - kizX; yurSure = uzak < 5 ? 0.35f : 0.45f + uzak / 367 * 1.95f; } } }
    if (jetonUcusta && t - jetonBas >= yurSure + 0.55) { jetonUcusta = false; dustuBayrak = 1; dustuAn = t; }
    if (kizIs == 1 && jetonBas >= 0 && !jetonUcusta && t - jetonBas > yurSure + 0.55 + 2.0) { jetonBas = -1; kizX = KIZDUR; kizIs = 0; }
    if (plakIstek && jetonBas < 0) { plakIstek = false; kizIs = 2; jetonBas = t; kizBasX = kizX; pd1 = 0.45f + std::fabs(1212 - kizX) / 367 * 1.95f; plakKondu = false; }
    if (kizIs == 2 && jetonBas >= 0) { float u = (float)(t - jetonBas);
        if (u >= pd1 + 0.5f) plakRafta = false;
        if (!plakKondu && u >= pd1 + 4.2f) { plakKondu = true; plakRenk = plakYeni; plakKonduB = 1; dustuAn = t; }
        if (u >= pd1 + 6.2f) { jetonBas = -1; kizX = KIZDUR; kizIs = 0; } }
    if (otoKamera) {
        int ist = sahneNo == 2 ? 4 : sahneNo == 1 ? 3 : jetonBas >= 0 ? kizIs == 2 ? 2 : (t - jetonBas < yurSure - 0.2 ? 0 : t - jetonBas < yurSure + 0.55 + 0.45 ? 1 : 2) : (kizX > 500 ? 2 : 0);
        if (ist != cekim) { cekim = ist;
            if (ist == 0 || ist == 2) odaCekimi();
            else if (ist == 1) kameraKoy(805, 545, 1.9f);
            else if (ist == 3) kayitCekimi(); else salonCekimi(); }
    }
    float hedef = caliyor ? 1.f : 0.f; calGuc += (hedef - calGuc) * (float)(1 - std::exp(-dt * 3.0));
    plakAci += (float)(dt * 3.49 * calGuc);
    { float hd = panelMod == 2 ? 1.f : 0.f; panelAnim += (hd - panelAnim) * (float)(1 - std::exp(-dt * 6.0)); if (std::fabs(hd - panelAnim) < 0.004f) panelAnim = hd; }
    yanAc += (yanHedef - yanAc) * (float)(1 - std::exp(-dt * 5.0)); if (std::fabs(yanHedef - yanAc) < 0.003f) yanAc = yanHedef;
    ritimFaz += (float)(dt * 2 * PI / vurusSn); if (ritimFaz > 8 * PI) ritimFaz -= 8 * PI;
    if (plakAci > 2 * PI) plakAci -= 2 * PI;
    if (gecisMod == 1) { float u = (float)(t - gecisBas); perde = yum(0.45f, 0.95f, u);
        if (u >= 0.95f) { sahneNo = gecisHedef; tazele = true; cekim = -1; gecisMod = 2; gecisBas = t; kapiHedef[0] = kapiHedef[1] = 0; kapiAc[0] = kapiAc[1] = 0; yanAc = yanHedef = 0;
            if (otoKamera) { if (sahneNo == 2) salonCekimi(); else if (sahneNo == 1) kayitCekimi(); else odaCekimi(); cekim = sahneNo == 2 ? 4 : sahneNo == 1 ? 3 : (kizX > 500 ? 2 : 0); } } }
    else if (gecisMod == 2) { float u = (float)(t - gecisBas); perde = 1 - yum(0, 0.45f, u); if (u >= 0.45f) { gecisMod = 0; perde = 0; } }
    if (perde < 0.999f) pazarSahnesi(t);
    if (perde > 0.003f) { unsigned a = (unsigned)(perde * 256), ia = 256 - a; uint8_t* p = CIK; for (size_t i = 0, n = (size_t)W * H; i < n; i++, p += 4) { p[0] = (uint8_t)((p[0] * ia + 255 * a) >> 8); p[1] = (uint8_t)((p[1] * ia + 236 * a) >> 8); p[2] = (uint8_t)((p[2] * ia + 190 * a) >> 8); } }
}
}
