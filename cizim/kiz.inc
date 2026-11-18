static const float KGX = 405, KGY = 778, KOL = 0.41f;
static const float ELX = 330, ELY = -900;

static inline float ymin(float a, float b, float k) { float h = kis(0.5f + 0.5f * (b - a) / k, 0, 1); return kar(b, a, h) - k * h * (1 - h); }
static auto duz(R c) { return [c](float, float, float) { return c; }; }

static auto kenarli(R c, R k, float w) { return [c, k, w](float, float, float d) { return kar(c, k, kis((d + w) * S + 0.5f, 0, 1)); }; }

static void yumusak(float cx, float cy, float rx, float ry, R c) {
    sekil(cx - rx, cy - ry, cx + rx, cy + ry, [&](float x, float y) { return uElips(x, y, cx, cy, rx, ry); },
          [&](float x, float y, float) { float qx = (x - cx) / rx, qy = (y - cy) / ry, q = 1 - (qx * qx + qy * qy); if (q < 0) q = 0; return R{c.r, c.g, c.b, c.a * q * q}; });
}

template <class Cl>
static void yay(float x0, float y0, float x1, float y1, float x2, float y2, float r0, float r1, Cl renk) {
    const int n = 12; float px[n + 1], py[n + 1];
    float ax = 1e9f, ay = 1e9f, bx = -1e9f, by = -1e9f, rm = r0 > r1 ? r0 : r1;
    for (int i = 0; i <= n; i++) {
        float s = i / (float)n, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
        px[i] = a * x0 + b * x1 + c * x2; py[i] = a * y0 + b * y1 + c * y2;
        if (px[i] < ax) ax = px[i]; if (px[i] > bx) bx = px[i]; if (py[i] < ay) ay = py[i]; if (py[i] > by) by = py[i];
    }
    sekil(ax - rm, ay - rm, bx + rm, by + rm, [&](float x, float y) {
        float d = 1e9f;
        for (int i = 0; i < n; i++) { float a = uKap(x, y, px[i], py[i], px[i + 1], py[i + 1], kar(r0, r1, i / (float)n), kar(r0, r1, (i + 1) / (float)n)); if (a < d) d = a; }
        return d; }, renk);
}

static inline R sacRenk(float x, float y, float d) {
    static const R ko = rgb(188, 174, 156), orta = rgb(218, 206, 188), ac = rgb(250, 244, 232), kn = rgb(126, 110, 96);
    float s1 = std::sin(y * 0.085f + 2.2f * std::sin(x * 0.05f + y * 0.012f));
    float s2 = std::sin(x * 0.17f + 2.0f * std::sin(y * 0.075f) + 1.3f);
    float v = 0.5f + 0.5f * (0.55f * s1 + 0.45f * s2);
    R c = v < 0.5f ? kar(ko, orta, v * 2) : kar(orta, ac, (v - 0.5f) * 2);
    float tel = std::fabs(std::sin(x * 0.42f + 1.8f * std::sin(y * 0.05f)));
    if (tel < 0.16f) { c.r *= 0.93f; c.g *= 0.93f; c.b *= 0.93f; }
    return kar(c, kn, kis((d + 1.8f) * S + 0.5f, 0, 1) * 0.55f);
}

static void cicek(float x, float y, float r) {
    for (int i = 0; i < 5; i++) {
        float a = i * 2 * PI / 5 - PI / 2, cx = x + std::cos(a) * r * 0.62f, cy = y + std::sin(a) * r * 0.62f;
        sekil(cx - r, cy - r, cx + r, cy + r, [&](float px, float py) { return uDaire(px, py, cx, cy, r * 0.56f); },
              [&](float px, float py, float d) { return kar(kar(rgb(255, 238, 240), rgb(244, 190, 202), kis(1 - uz(px - x, py - y) / r, 0, 1)), rgb(222, 150, 170), kis((d + 1.6f) * S + 0.5f, 0, 1) * 0.6f); });
    }
    daire(x, y, r * 0.30f, altin(0.82f));
}

static inline float deri(float x, float y) { return std::fabs(std::sin((x + y) * 0.9f)) * std::fabs(std::sin((x - y) * 0.9f)); }

template <class Sd, class Ek, class Rn>
static void hacimli(float x0, float y0, float x1, float y1, Sd sdf, float Rk, Ek ek, Rn renk, float parlak) {
    auto yuk = [&](float x, float y) { float d = sdf(x, y); if (d >= 0) return 0.f; float t = d < -Rk ? 0 : Rk + d; return std::sqrt(Rk * Rk - t * t) + ek(x, y); };
    sekil(x0, y0, x1, y1, sdf, [&](float x, float y, float) {
        const float h = 0.5f;
        float zx = (yuk(x + h, y) - yuk(x - h, y)) / (2 * h), zy = (yuk(x, y + h) - yuk(x, y - h)) / (2 * h);
        float nx = -zx, ny = -zy, nz = 1, m = std::sqrt(nx * nx + ny * ny + 1); nx /= m; ny /= m; nz /= m;
        float w = 0.80f; (void)nx; (void)ny; (void)nz;
        (void)w; (void)parlak; return renk(x, y); });
}

static float kirpZor = -1;
static void kizBoya(double t) {
    const R ten = rgb(253, 231, 218), tenG = rgb(238, 196, 184), tenK = rgb(216, 158, 150);
    const R kirmizi = rgb(206, 42, 48), kirmiziG = rgb(142, 20, 32), kirmiziK = rgb(104, 12, 24);
    const R tur = rgb(40, 176, 186), turG = rgb(16, 112, 126), turK = rgb(10, 78, 92);
    const R krem = rgb(248, 240, 226), kremG = rgb(214, 200, 180), pembe = rgb(240, 172, 204);
    float sal = 0;
    float u = jetonBas >= 0 ? (float)(t - jetonBas) : -1;
    float hx = 120, hy = -520;
    if (u >= 0 && u < 1.3f) {
        if (u < 0.36f) { float k = yum(0, 0.36f, u); hx = kar(120, 110, k); hy = kar(-520, -1030, k); }
        else if (u < 0.50f) { float k = yum(0.36f, 0.50f, u); hx = kar(110, ELX, k); hy = kar(-1030, ELY, k); }
        else { float k = yum(0.62f, 1.3f, u); hx = kar(ELX, 120, k); hy = kar(ELY, -520, k); }
    }
    bool atiyor = u >= 0 && u < 1.3f;

    for (int kk = 0; kk < 2; kk++) {
        float k = kk == 0 ? -1.f : 1.f;
        sekil(k * 40 - 60, -590, k * 40 + 60, -70, [&](float x, float y) {
            float a = uKap(x, y, k * 36, -560, k * 38, -300, 46, 31), b = uKap(x, y, k * 38, -300, k * 40, -85, 31, 20), c = uElips(x, y, k * 42, -215, 31, 62);
            return ymin(ymin(a, b, 10), c, 14); },
              [&](float x, float y, float d) {
                  float g = kis(0.10f + 0.55f * (x - k * 38) / 30 + 0.55f * yum(-10, -1, d), 0, 1);
                  if (y < -384) return kar(kar(ten, tenG, g), tenK, kis((d + 2.6f) * S + 0.5f, 0, 1) * 0.7f);
                  if (y < -368) return altin(0.50f + 0.30f * std::sin(x * 0.5f) - 0.2f * g);
                  R c = kar(krem, kremG, g); { float o = 0.965f + 0.035f * std::sin(x * 2.4f); c.r *= o; c.g *= o; c.b *= o; }
                  if (std::fabs(y + 300) < 26) { float p = 1 - std::fabs(y + 300) / 26; c = kar(c, rgb(255, 252, 244), p * 0.5f * (1 - g)); }
                  return kar(c, rgb(170, 154, 132), kis((d + 2.6f) * S + 0.5f, 0, 1) * 0.7f); });

        sekil(k * 40 - 70, -124, k * 40 + 80, 4, [&](float x, float y) {
            float a = uKutu(x, y, k * 40, -62, 25, 54, 15), b = uKap(x, y, k * 42, -22, k * 86, -17, 24, 18);
            float c = ymin(a, b, 10); return c > y - 0 ? c : y; },
              [&](float x, float y, float d) {
                  float xo = (x - k * 40) * k;
                  R c = kirmizi;
                  if (y > -10) c = rgb(252, 250, 246);
                  else if (xo > 30) c = rgb(250, 246, 240);
                  else if (xo < -8 && y > -58) c = tur;
                  else if (std::fabs(y + 62) < 5) c = tur;
                  else c = kar(kirmiziG, kirmizi, kis(0.5f + xo / 40, 0, 1));
                  return kar(c, rgb(70, 20, 30), kis((d + 2.6f) * S + 0.5f, 0, 1) * 0.6f); });
        for (int j = 0; j < 5; j++) daire(k * 40 - 24 + j * 12, -116 + 2 * std::sin(j * 1.5f), 10, j % 2 ? rgb(244, 238, 228) : rgb(255, 252, 246));

        elips(k * 40 + k * 14 - 9, -92, 9, 6, altin(0.62f)); elips(k * 40 + k * 14 + 9, -92, 9, 6, altin(0.72f)); daire(k * 40 + k * 14, -92, 4.5f, altin(0.9f));
        kapsul(k * 40 + k * 14, -90, k * 40 + k * 8, -72, 2.5f, 1.2f, altin(0.6f)); kapsul(k * 40 + k * 14, -90, k * 40 + k * 22, -72, 2.5f, 1.2f, altin(0.6f));
    }

    { const float et[4][2] = {{-60, -644}, {60, -644}, {154, -452}, {-154, -452}};
      cokgen(et, 4, [&](float x, float y, float d) {
          float k = kis((y + 644) / 192, 0, 1);
          R c = k < 0.28f ? kar(rgb(226, 112, 116), rgb(252, 240, 238), k / 0.28f) : kar(rgb(252, 240, 238), rgb(170, 224, 228), (k - 0.28f) / 0.72f);
          float yari = 60 + 94 * k, f = kes(x / yari * 7.5f + 0.5f);
          float g = 0.86f + 0.14f * yum(0.0f, 0.5f, f); if (f < 0.07f) g = 0.74f;
          c.r *= g; c.g *= g; c.b *= g;
          if (k > 0.955f) c = tur;
          return kar(c, rgb(120, 150, 160), kis((d + 2.4f) * S + 0.5f, 0, 1) * 0.6f); }); }

    for (int kk = 0; kk < 2; kk++) {
        float k = kk == 0 ? -1.f : 1.f;
        const float f[5][2] = {{k * 36, -648}, {k * 70, -648}, {k * 134, -522}, {k * 104, -498}, {k * 50, -540}};
        cokgen(f, 5, [&](float x, float y, float d) {
            if (d > -7) return kar(tur, turK, kis((d + 2.2f) * S + 0.5f, 0, 1));
            if (d > -9.5f) return altin(0.7f);
            float n = 0.84f + 0.26f * deri(x, y); R c = kar(kirmizi, kirmiziG, kis((y + 648) / 150, 0, 1)); c.r *= n; c.g *= n; c.b *= n; return c; });
    }

    { const float f[5][2] = {{-26, -640}, {26, -640}, {32, -520}, {0, -474}, {-32, -520}};
      cokgen(f, 5, [&](float x, float y, float d) {
          if (d > -6.5f) return kar(tur, turK, kis((d + 2.2f) * S + 0.5f, 0, 1));
          if (d > -9) return altin(0.75f);
          if (uz(x, y + 524) < 9) return altin(0.85f);
          { float n = 0.84f + 0.26f * deri(x, y); R c = kar(kirmizi, kirmiziG, kis((y + 640) / 160, 0, 1)); c.r *= n; c.g *= n; c.b *= n; return c; } });
      daire(0, -462, 6, rgb(255, 250, 240)); daire(0, -448, 5, tur); kapsul(0, -442, 0, -418, 3.5f, 1.2f, rgb(160, 90, 46)); }

    sekil(-24, -872, 24, -790, [&](float x, float y) { return uKap(x, y, 0, -862 + sal, 0, -800, 15.5f, 21); },
          [&](float x, float y, float) {
              R c = kar(rgb(255, 245, 238), rgb(224, 178, 168), yum(-5, 15, x));
              c = kar(c, rgb(238, 200, 188), 0.6f * yum(-7, -15, x));
              c = kar(c, rgb(194, 136, 130), 0.88f * kis((-828 + sal - y) / 26, 0, 1));
              float kas = std::fabs(std::fabs(x) - 7.5f - (y + 850) * 0.10f);
              if (y > -846 + sal) c = kar(c, rgb(226, 182, 172), 0.35f * (1 - yum(0.6f, 2.2f, kas)));
              return c; });

    hacimli(-124, -836, 124, -606, [&](float x, float y) {
        float a = uElips(x, y, 0, -742 + sal * 0.4f, 80, 76), b = uElips(x, y, 0, -662, 58, 46), c = uKap(x, y, -74, -794 + sal * 0.6f, 74, -794 + sal * 0.6f, 30, 30);
        return ymin(ymin(a, b, 26), c, 22); }, 62,
            [&](float x, float y) {
                float gogus = 9 * (std::exp(-((x - 27) * (x - 27)) / 560.f - ((y + 742) * (y + 742)) / 480.f) + std::exp(-((x + 27) * (x + 27)) / 560.f - ((y + 742) * (y + 742)) / 480.f));
                float kivrim = 1.8f * std::sin(x * 0.07f - y * 0.13f) * yum(-720, -660, y);
                return 0.9f * deri(x, y) + gogus + kivrim; },
            [&](float, float) { return kirmizi; }, 0.30f);

    { const float bg[3][2] = {{-42, -829 + sal}, {42, -829 + sal}, {0, -740}};
      cokgen(bg, 3, [&](float x, float y, float) { R c = kar(rgb(255, 242, 234), rgb(240, 204, 192), kis((y + 829) / 80, 0, 1)); return kar(c, rgb(226, 182, 172), 0.5f * yum(4, 30, x)); }); }

    yumusak(-17, -816 + sal, 17, 3.4f, rgb(210, 158, 148, 0.50f)); yumusak(17, -816 + sal, 17, 3.4f, rgb(204, 150, 142, 0.55f));
    yumusak(-16, -821 + sal, 15, 2.4f, rgb(255, 250, 245, 0.60f)); yumusak(16, -821 + sal, 15, 2.4f, rgb(255, 246, 240, 0.45f));
    yumusak(0, -817 + sal, 4.5f, 5, rgb(204, 148, 140, 0.55f));
    yumusak(0, -790, 5, 22, rgb(226, 180, 170, 0.35f));
    yay(-17, -846 + sal, 0, -838 + sal, 17, -846 + sal, 1.8f, 1.8f, duz(turG));
    yay(-19, -835 + sal, 0, -825 + sal, 19, -835 + sal, 1.8f, 1.8f, duz(tur)); daire(0, -823 + sal, 3.4f, tur);
    yay(46, -838 + sal, 30, -790, -5, -738, 9, 6, kenarli(turG, turK, 2.0f));
    yay(-46, -838 + sal, -30, -790, 5, -738, 9, 6, kenarli(turG, turK, 2.0f));
    for (int j = 0; j < 4; j++) {
        float s = 0.2f + j * 0.2f, lx = kar(-44, -6, s), ly = kar(-822, -752, s);
        kapsul(lx - 6, ly + 4, lx + 5, ly - 5, 2.2f, 0.6f, rgb(120, 226, 232)); kapsul(-lx + 6, ly + 4, -lx - 5, ly - 5, 2.2f, 0.6f, rgb(120, 226, 232));
    }
    yay(70, -836 + sal, 56, -772, -10, -708, 17, 10, kenarli(rgb(222, 58, 62), kirmiziK, 2.8f));
    yay(-70, -836 + sal, -56, -772, 10, -708, 17, 10, kenarli(rgb(214, 48, 54), kirmiziK, 2.8f));

    sekil(-30, -716, 30, -690, [&](float x, float y) { float a = std::fabs(uElips(x, y, -14, -703, 12, 7)) - 1.7f, b = std::fabs(uElips(x, y, 14, -703, 12, 7)) - 1.7f; return a < b ? a : b; }, duz(kirmiziK));
    kapsul(0, -704, -11, -664, 1.8f, 1.2f, kirmiziK); kapsul(0, -704, 10, -662, 1.8f, 1.2f, kirmiziK); daire(0, -704, 3.4f, kirmiziK);

    for (int j = 0; j <= 26; j++) { float s = j / 26.f; daire(kar(-66, 66, s), kar(-806, -650, s) + 10 * std::sin(s * PI), 2.3f, altin(j % 2 ? 0.8f : 0.5f)); }
    daire(52, -746, 9, altin(0.7f)); daire(63, -753, 7, altin(0.8f)); daire(43, -753, 6.5f, altin(0.62f)); daire(54, -757, 6, altin(0.9f));
    yay(34, -742, 52, -728, 74, -744, 3.4f, 1, duz(altin(0.72f)));

    sekil(-64, -668, 64, -612, [&](float x, float y) { return uKutu(x, y, 0, -640, 60, 24, 9); },
          [&](float x, float y, float d) {
              if (d > -4) return altin(0.5f + 0.25f * std::sin(x * 0.3f));
              R c = kar(tur, turG, kis((y + 664) / 48, 0, 1));
              float s = std::sin(x * 0.22f + 2 * std::sin(y * 0.3f)); if (s > 0.7f) c = kar(c, rgb(130, 232, 236), 0.6f);
              return c; });
    sekil(-76, -692, 76, -606, [&](float x, float y) {
        float a = uElips(x, y, 0, -640, 33, 26), b = uElips(x, y, -44, -648, 28, 12), c = uElips(x, y, 44, -648, 28, 12);
        float d = ymin(ymin(a, b, 9), c, 9);
        float s1 = uKap(x, y, 0, -662, 0, -686, 8, 1), s2 = uKap(x, y, -18, -658, -28, -680, 7, 1), s3 = uKap(x, y, 18, -658, 28, -680, 7, 1);
        d = ymin(d, s1, 4); d = ymin(d, s2, 4); d = ymin(d, s3, 4); return d; },
          [&](float x, float y, float d) {
              float v = 0.42f + 0.42f * kis(1 - (y + 680) / 70, 0, 1) + 0.08f * std::sin(x * 0.35f);
              if (uElips(x, y, -13, -648, 7, 4) < 0 || uElips(x, y, 13, -648, 7, 4) < 0) v = 0.12f;
              if (std::fabs(uElips(x, y, 0, -640, 24, 18)) < 1.2f) v -= 0.25f;
              if (uDaire(x, y, 0, -626, 7) < 0) return kar(rgb(120, 232, 236), turG, kis(uz(x + 2, y + 628) / 7, 0, 1));
              return kar(altin(v), rgb(84, 50, 8), kis((d + 2.2f) * S + 0.5f, 0, 1) * 0.8f); });
    for (int j = 0; j <= 12; j++) { float x = -54 + j * 9.f, y = -610 + 16 * (1 - (x / 54) * (x / 54)); daire(x, y, 3.3f, rgb(255, 250, 240)); }

    float by = sal;

    float my = -864 + by;
    auto gul = [&](float x) { return -0.010f * x * x; };
    auto cizgi = [&](float x) { return my - 0.2f + gul(x); };
    auto ustDudak = [&](float x, float y) { float q = y - gul(x), a = uElips(x, q, -4.6f, my - 2.6f, 8.0f, 3.7f), b = uElips(x, q, 4.6f, my - 2.6f, 8.0f, 3.7f), d = ymin(a, b, 1.6f), c = y - cizgi(x); return d > c ? d : c; };
    auto altDudak = [&](float x, float y) { float d = uElips(x, y - gul(x), 0, my + 1.0f, 10.6f, 4.3f), c = cizgi(x) - y; return d > c ? d : c; };
    auto yuzD = [&](float x, float y) { return ymin(ymin(uDaire(x, y, 0, -940 + by, 59), uElips(x, y, 0, -897 + by, 48, 50), 30), uElips(x, y, 0, -867 + by, 34, 27), 22); };
    auto g = [](float dx, float dy, float sx, float sy) { return std::exp(-(dx * dx) / (sx * sx) - (dy * dy) / (sy * sy)); };
    auto yuk = [&](float x, float y) {
        float yy = y - by, d = yuzD(x, y); const float Rk = 46;
        float tt = d < -Rk ? 0 : (Rk + d), z = d >= 0 ? 0 : std::sqrt(Rk * Rk - tt * tt);
        z += 2.4f * std::exp(-(x * x) / 60.f) * yum(-932, -912, yy) * (1 - yum(-892, -880, yy));
        z += 10.0f * g(x, yy + 885, 6.5f, 6.0f);
        z += 3.5f * (g(x - 6.5f, yy + 881, 4.0f, 3.2f) + g(x + 6.5f, yy + 881, 4.0f, 3.2f));
        z -= 5.0f * (g(x - 27, yy + 911, 16, 9) + g(x + 27, yy + 911, 16, 9));
        z += 4.5f * (g(x - 36, yy + 882, 21, 16) + g(x + 36, yy + 882, 21, 16));
        z += 4.0f * g(x, yy + 866.5f, 8.0f, 2.4f) - 1.6f * g(x, yy + 870, 2.2f, 3.0f);
        z += 5.0f * g(x, yy + 861, 6.8f, 3.0f);
        z -= 2.5f * g(x, yy + 864, 9.0f, 0.9f);
        z -= 2.0f * g(x, yy + 855.5f, 9, 2.0f);
        z += 2.5f * g(x, yy + 848, 9, 5);
        return z; };
    sekil(-68, -1002 + by, 68, -830 + by, yuzD,
          [&](float x, float y, float d) {
              const float h = 0.9f; float yy = y - by;
              float zx = (yuk(x + h, y) - yuk(x - h, y)) / (2 * h), zy = (yuk(x, y + h) - yuk(x, y - h)) / (2 * h);
              float nx = -zx, ny = -zy, nz = 1, m = std::sqrt(nx * nx + ny * ny + 1); nx /= m; ny /= m; nz /= m;
              float w = 0.80f; (void)nx; (void)ny; (void)nz;
              R c = w < 0.55f ? kar(rgb(218, 164, 154), rgb(251, 224, 212), w / 0.55f) : kar(rgb(251, 224, 212), rgb(255, 247, 241), (w - 0.55f) / 0.45f);
              for (int kk = 0; kk < 2; kk++) { float bx = kk == 0 ? -34.f : 34.f, r2 = (x - bx) * (x - bx) + (yy + 886) * (yy + 886) * 1.5f; c = kar(c, rgb(246, 172, 164), 0.30f * std::exp(-r2 / 440.f)); }
              { float r2 = x * x + (yy + 886) * (yy + 886); c = kar(c, rgb(244, 160, 160), 0.14f * std::exp(-r2 / 80.f)); }
              float sp = 0;
              float au = kis(-ustDudak(x, y) / 1.3f + 0.5f, 0, 1), al = kis(-altDudak(x, y) / 1.3f + 0.5f, 0, 1);
              if (au > 0 || al > 0) {
                  R du = rgb(204, 88, 104), dl = rgb(232, 122, 132);
                  dl = kar(dl, rgb(255, 232, 230), 0.55f * std::exp(-((x + 1.5f) * (x + 1.5f)) / 22.f - ((y - my - 2.6f - gul(x)) * (y - my - 2.6f - gul(x))) / 1.6f));
                  float sl = sp > 0 ? std::pow(sp, 2.2f) : 0;
                  dl.r += 0.55f * sl; dl.g += 0.55f * sl; dl.b += 0.55f * sl;
                  c = kar(c, du, au); c = kar(c, dl, al);
              } else { c.r += 0.07f * sp; c.g += 0.065f * sp; c.b += 0.06f * sp; }
              { float ca = std::fabs(y - cizgi(x)); if (std::fabs(x) < 13.2f) c = kar(c, rgb(128, 48, 66), 0.85f * kis(1.25f - ca, 0, 1) * (1 - yum(11.0f, 13.2f, std::fabs(x)))); }
              for (int kk = 0; kk < 2; kk++) { float bx = kk == 0 ? -12.6f : 12.6f, r2 = (x - bx) * (x - bx) + (y - cizgi(bx)) * (y - cizgi(bx)); c = kar(c, rgb(190, 112, 112), 0.50f * std::exp(-r2 / 3.2f)); }
              c.a = kis(-d / 1.2f, 0, 1);
              return c; });
    for (int kk = 0; kk < 2; kk++) {
        float k = kk == 0 ? -1.f : 1.f, ex = k * 27, ey = -911 + by; const float G = 0.97f;
        const R kirpik = rgb(98, 66, 60);
        float kf = (float)std::fmod(t + 1.3, 4.2), kp = kf < 0.18f ? std::sin(kf / 0.18f * PI) * 13.5f : 0; if (kirpZor >= 0) kp = kirpZor * 13.5f;
        yumusak(ex + k * 3, ey - 4, 25, 15, rgb(226, 120, 128, 0.40f));
        yumusak(ex + k * 13, ey + 1, 11, 8, rgb(214, 110, 116, 0.30f));
        yumusak(ex, ey + 13.5f, 16, 4.5f, rgb(255, 244, 238, 0.35f));

        sekil(ex - 32, ey - 23, ex + 32, ey + 15, [&](float x, float y) {
            float u = (x - ex) * k / G, v = (y - ey) / G + u * 0.10f;
            float du = uz(u, v - 10.5f - kp) - 19.96f, dl = uz(u, v + 21.1f) - 27.1f, goz = du > dl ? du : dl;
            float th = 0.9f + 1.2f * yum(-10, 17, u);
            float kir = std::fabs(du) - th, sn = std::fabs(u - 0.5f) - 18.2f; if (sn > kir) kir = sn; if (v - 1.0f > kir) kir = v - 1.0f;
            float kanat = uKap(u, v, 16, -0.4f, 19.5f, -2.2f, 1.4f, 0.3f);
            float d = goz < kir ? goz : kir; return (d < kanat ? d : kanat) * G; },
              [&](float x, float y, float) {
                  float u = (x - ex) * k / G, v = (y - ey) / G + u * 0.10f;
                  float du = uz(u, v - 10.5f - kp) - 19.96f, dl = uz(u, v + 21.1f) - 27.1f, goz = du > dl ? du : dl;
                  if (goz > 0) return kirpik;
                  float th = 0.9f + 1.2f * yum(-10, 17, u);
                  float ka = kis((th - std::fabs(du)) * S * G + 0.5f, 0, 1); if (std::fabs(u - 0.5f) > 18.2f || v > 1.0f) ka = 0;
                  R c = kar(rgb(176, 160, 170), rgb(240, 230, 228), yum(-8, 1, v));
                  c = kar(c, rgb(238, 196, 192), yum(-11, -17, u) * 0.7f);
                  float r = uz(u + 0.5f, v + 2.4f);
                  if (r < 11.6f) {
                      R ir = kar(rgb(78, 100, 128), rgb(178, 202, 218), yum(-9, 9, v));
                      float aci = std::atan2(v + 2.4f, u + 0.5f), lif = 0.90f + 0.07f * std::sin(aci * 36) + 0.05f * std::sin(aci * 13 + 1);
                      ir.r *= lif; ir.g *= lif; ir.b *= lif;
                      ir = kar(ir, rgb(196, 226, 240), 0.38f * (1 - yum(4.6f, 7.6f, r)));
                      ir = kar(ir, rgb(36, 52, 88), yum(8.6f, 11.0f, r));
                      ir = kar(ir, rgb(44, 64, 100), 0.55f * yum(-2, -9, v));
                      ir = kar(ir, rgb(16, 16, 32), 1 - yum(3.7f, 4.6f, r));
                      c = kar(c, ir, kis((11.0f - r) * S * G + 0.5f, 0, 1));
                  }
                  return kar(c, kirpik, ka); });
        yumusak(ex - 4.0f * G, ey - 5.0f * G, 4.6f * G, 3.8f * G, rgb(255, 255, 255, 1.0f)); daire(ex - 4.0f * G, ey - 5.0f * G, 1.9f * G, rgb(255, 255, 255, 0.95f)); yumusak(ex + 4.4f * G, ey + 3.8f * G, 2.6f * G, 2.2f * G, rgb(230, 244, 255, 0.7f));
        yay(ex - k * 12 * G, ey + 4.2f * G, ex + k * 2 * G, ey + 9.2f * G, ex + k * 16 * G, ey - 0.8f * G, 0.6f, 0.9f, duz(rgb(176, 116, 112, 0.8f)));
        yay(ex - k * 13 * G, ey - 9 * G, ex, ey - 21 * G, ex + k * 17 * G, ey - 9.5f * G, 0.6f, 0.6f, duz(rgb(200, 140, 138, 0.75f)));
        yay(ex - k * 16, ey - 21, ex + k * 2, ey - 26.5f, ex + k * 20, ey - 22, 1.5f, 0.6f, duz(rgb(184, 158, 138, 0.45f)));
        for (int i = 0; i < 30; i++) {
            float q = i / 29.f, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q;
            float bx = a * (ex - k * 16) + b * (ex + k * 2) + c * (ex + k * 20), byy = a * (ey - 21) + b * (ey - 26.5f) + c * (ey - 22);
            kapsul(bx, byy + 1.4f, bx + k * (2.2f + 1.6f * q), byy - 2.0f + 2.0f * q, 0.42f, 0.12f, rgb(160, 134, 114, 0.6f));
        }
        auto GX = [&](float uu) { return ex + k * uu * G; }; auto GY = [&](float uu, float vv) { return ey + (vv - uu * 0.10f) * G; };
        for (int i = 0; i < 12; i++) {
            float uu = -12 + i * 2.7f, vv = 10.5f + kp - std::sqrt(19.96f * 19.96f - uu * uu);
            float nx = uu / 19.96f + 0.30f + 0.025f * i, ny = (vv - 10.5f - kp) / 19.96f, nm = uz(nx, ny), L = 1.2f + 0.18f * i;
            kapsul(GX(uu), GY(uu, vv), GX(uu + nx / nm * L), GY(uu + nx / nm * L, vv + ny / nm * L - 0.7f), 0.7f, 0.16f, kirpik);
        }
        for (int i = 0; i < 7; i++) {
            float uu = -7 + i * 3.6f, vv = -21.1f + std::sqrt(27.1f * 27.1f - uu * uu);
            kapsul(GX(uu), GY(uu, vv), GX(uu + 0.9f + 0.15f * i), GY(uu, vv + 0.8f), 0.3f, 0.1f, rgb(160, 112, 108, 0.45f));
        }
    }

    yumusak(-5.0f, -879 + by, 2.5f, 1.5f, rgb(170, 100, 100, 0.6f)); yumusak(5.0f, -879 + by, 2.5f, 1.5f, rgb(170, 100, 100, 0.6f));
    sekil(-12, my - 4, 12, my + 2, [&](float x, float y) { float a = std::fabs(y - cizgi(x)) - 0.42f, b = std::fabs(x) - 8.8f; return a > b ? a : b; }, duz(rgb(150, 70, 78, 0.8f)));
    yumusak(-9.7f, my - 1.6f, 2.3f, 1.7f, rgb(180, 110, 110, 0.45f)); yumusak(9.7f, my - 1.6f, 2.3f, 1.7f, rgb(180, 110, 110, 0.45f));

}
