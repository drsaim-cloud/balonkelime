/**
 * Harf Balonu — React Native + Expo + Skia
 * iOS & Android
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Platform, Vibration,
} from 'react-native';
import { Canvas, useCanvasRef, Skia, Paint, Path, Circle,
         RadialGradient, LinearGradient, vec, Group,
         usePaintRef, drawCircle } from '@shopify/react-native-skia';
import { useFonts, Rubik_700Bold, Rubik_900Black } from '@expo-google-fonts/rubik';
import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';

import { pickWord, resetUsedWords, VOWELS_SET } from './src/game/words';
import { traceAimLine, buildCluster } from './src/game/physics';
import { randomColor, BALL_COLORS } from './src/game/colors';

SplashScreen.preventAutoHideAsync();

const { width: SW, height: SH } = Dimensions.get('window');
const R         = Math.min(Math.floor((SW - 60) / 14), 32);
const PANEL_H   = 80;
const CANNON_X  = SW / 2;
const CANNON_Y  = SH - PANEL_H - 28;
const CLUSTER_Y = SH * 0.44;
const MAX_TIME  = 45;
const SAFE_TOP  = Platform.OS === 'ios' ? 100 : 80;

// ─── Game loop using requestAnimationFrame ────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({ Rubik_700Bold, Rubik_900Black });

  // UI state
  const [phase, setPhase]       = useState('loading'); // loading|start|playing|end
  const [score, setScore]       = useState(0);
  const [round, setRound]       = useState(1);
  const [timer, setTimer]       = useState(MAX_TIME);
  const [hintLeft, setHintLeft] = useState(2);
  const [ghostOn, setGhostOn]   = useState(true);
  const [wordProgress, setWordProgress] = useState([]);
  const [motivation, setMotivation]     = useState(null);
  const [endMsg, setEndMsg]             = useState('');

  // Game refs (mutable, not re-render)
  const G = useRef({
    balls: [], bullet: null, particles: [], ghostPts: [],
    target: null, score: 0, round: 1, timeLeft: MAX_TIME,
    hintLeft: 2, ghostOn: true,
    shooting: false, falling: false,
    cannonAngle: -Math.PI / 2,
    animFrame: null, lastTs: 0,
    ballId: 0,
  }).current;

  const timerRef = useRef(null);
  const canvasRef = useCanvasRef();

  // ── Font + splash ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setPhase('start');
    }
  }, [fontsLoaded]);

  // ── Game start ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    resetUsedWords();
    G.score = 0; G.round = 1; G.hintLeft = 2;
    G.ghostOn = true; G.balls = []; G.particles = [];
    setScore(0); setRound(1); setHintLeft(2); setGhostOn(true);
    setPhase('playing');
    startRound();
  }, []);

  function startRound() {
    const word = pickWord(G.round);
    G.target    = { word, progress: 0, hintRevealed: [] };
    G.bullet    = null; G.ghostPts = []; G.shooting = false; G.falling = false;
    G.particles = [];
    G.balls     = buildBalls(word);
    G.timeLeft  = MAX_TIME;
    setTimer(MAX_TIME);
    setWordProgress(Array(word.length).fill(null));
    startTimer();
    if (!G.animFrame) G.animFrame = requestAnimationFrame(loop);
  }

  function startTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (G.falling) return;
      G.timeLeft = Math.max(0, G.timeLeft - 1);
      setTimer(G.timeLeft);
      if (G.timeLeft <= 0) endGame();
    }, 1000);
  }

  function endGame() {
    clearInterval(timerRef.current);
    cancelAnimationFrame(G.animFrame);
    G.animFrame = null;
    const msg =
      G.timeLeft >= 35 ? '⚡ İNANILMAZ!' :
      G.timeLeft >= 25 ? '🔥 ÇOK HIZLISIN!' :
      G.timeLeft >= 15 ? '👏 SÜPER!' :
      G.timeLeft >= 8  ? '💪 İYİ İŞ!' : '😅 AZ KALDI!';
    setEndMsg(`${msg}\nPuan: ${G.score} · Tur ${G.round}`);
    setPhase('end');
  }

  // ── Build balls ────────────────────────────────────────────────────────────
  function buildBalls(word) {
    const letters = [...word].sort(() => Math.random() - .5);
    const placed  = buildCluster(letters, R, SW / 2, CLUSTER_Y);
    const dangerY = CANNON_Y - R * 4;
    return placed.map(({ ch, x, y }) => ({
      id: G.ballId++, ch,
      x: Math.max(R + 4, Math.min(SW - R - 4, x)),
      y: Math.max(SAFE_TOP + R, Math.min(dangerY - R, y)),
      cp: randomColor(),
      popping: false, popT: 0, opacity: 1,
      falling: false, vy: 0, flash: false,
    }));
  }

  // ── Shoot ──────────────────────────────────────────────────────────────────
  function shoot() {
    if (G.shooting || G.falling || phase !== 'playing') return;
    G.shooting = true;
    G.bullet = {
      x: CANNON_X, y: CANNON_Y,
      vx: Math.cos(G.cannonAngle) * 16,
      vy: Math.sin(G.cannonAngle) * 16,
      trail: [], bounced: false,
    };
  }

  // ── Hit ────────────────────────────────────────────────────────────────────
  function onHit(b) {
    burst(b.x, b.y, b.cp.base, 22);
    b.popping = true; b.popT = 0;

    const needed = G.target?.word[G.target.progress];
    if (!needed || b.ch !== needed) {
      G.timeLeft = Math.max(0, G.timeLeft - 5);
      setTimer(G.timeLeft);
      flashMotivation('❌ -5 sn', '#ff4444');
      setTimeout(() => respawn(b), 500);
      return;
    }

    const li = G.target.progress++;
    const wasBounced = G.bullet?.bounced;
    const base  = Math.max(1, G.timeLeft) * 2;
    const bonus = G.ghostOn ? 1 : 1.2;
    const pts   = Math.round(base * bonus);
    G.score += pts;
    setScore(G.score);

    // Update slot
    const newProg = [...G.target.word].map((ch, i) =>
      i < G.target.progress ? ch : null
    );
    setWordProgress(newProg);

    // Motivation
    if (wasBounced && !G.ghostOn) {
      flashMotivation('🎯 SÜPER!', '#ffe44d');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (wasBounced) {
      flashMotivation('🏀 SÜPER!', '#74b9ff');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (G.target.progress === G.target.word.length) {
      setTimeout(() => roundComplete(), 400);
    }
  }

  function roundComplete() {
    clearInterval(timerRef.current);
    G.falling = true;
    G.balls.forEach(b => { if (!b.popping) { b.falling = true; b.vy = 1 + Math.random() * 3; } });
    confettiBurst();
    setTimeout(() => {
      G.round++; setRound(G.round);
      G.balls = []; G.particles = []; G.bullet = null;
      G.falling = false;
      startRound();
    }, 2000);
  }

  function confettiBurst() {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 12;
      G.particles.push({
        x: SW / 2 + (Math.random() - .5) * 80,
        y: SH / 2 + (Math.random() - .5) * 80,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4,
        r: 4 + Math.random() * 7,
        color: ['#ffe44d','#ff9800','#2ecc71','#3498db','#e74c3c','#a29bfe'][Math.floor(Math.random() * 6)],
        life: 1, decay: .018 + Math.random() * .015,
        sq: Math.random() < .5,
      });
    }
  }

  function respawn(b) {
    // Find empty spot near cluster
    for (let i = 0; i < 40; i++) {
      const x = SW / 2 + (Math.random() - .5) * R * 12;
      const y = CLUSTER_Y + (Math.random() - .5) * R * 10;
      const dy = CANNON_Y - R * 4;
      if (x < R + 4 || x > SW - R - 4 || y < SAFE_TOP + R || y > dy) continue;
      const ok = !G.balls.some(o => {
        const dx = o.x - x, dy = o.y - y;
        return dx * dx + dy * dy < (R * 2.1) * (R * 2.1);
      });
      if (ok) {
        G.balls.push({ id: G.ballId++, ch: b.ch, x, y, cp: randomColor(),
          popping: false, popT: 0, opacity: 0, falling: false, vy: 0, flash: false });
        return;
      }
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 8;
      G.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
        r: 3 + Math.random() * 6, color, life: 1,
        decay: .025 + Math.random() * .03, sq: Math.random() < .4,
      });
    }
  }

  // ── Motivation flash ───────────────────────────────────────────────────────
  let motivTimer = null;
  function flashMotivation(text, color) {
    setMotivation({ text, color });
    clearTimeout(motivTimer);
    motivTimer = setTimeout(() => setMotivation(null), 900);
  }

  // ── Hint ───────────────────────────────────────────────────────────────────
  const useHint = useCallback(() => {
    if (G.hintLeft <= 0 || !G.target) return;
    const next = G.target.progress;
    if (next >= G.target.word.length) return;
    if (G.target.hintRevealed.includes(next)) return;
    G.target.hintRevealed.push(next);
    G.hintLeft--;
    setHintLeft(G.hintLeft);
    G.timeLeft = Math.max(0, G.timeLeft - 5);
    setTimer(G.timeLeft);
    // Pop matching ball
    const ch = G.target.word[next];
    const mb = G.balls.find(b => !b.popping && !b.falling && b.ch === ch);
    if (mb) {
      burst(mb.x, mb.y, mb.cp.base, 18);
      mb.popping = true; mb.popT = 0;
      G.target.progress++;
      const newProg = [...G.target.word].map((c, i) => i < G.target.progress ? c : null);
      setWordProgress(newProg);
      if (G.target.progress === G.target.word.length) setTimeout(roundComplete, 400);
    }
    flashMotivation(`💡 "${ch}" -5sn`, '#a29bfe');
  }, []);

  // ── Ghost toggle ───────────────────────────────────────────────────────────
  const toggleGhost = useCallback(() => {
    G.ghostOn = !G.ghostOn;
    setGhostOn(G.ghostOn);
    if (!G.ghostOn) G.ghostPts = [];
  }, []);

  // ── Touch ──────────────────────────────────────────────────────────────────
  function handleTouch(evt) {
    const { locationX: x, locationY: y } = evt.nativeEvent;
    if (phase !== 'playing' || G.falling) return;
    let a = Math.atan2(y - CANNON_Y, x - CANNON_X);
    a = Math.max(-Math.PI + .06, Math.min(-.06, a));
    G.cannonAngle = a;
    G.ghostPts = G.ghostOn
      ? traceAimLine({ startX: CANNON_X, startY: CANNON_Y, angle: a, screenW: SW, balls: G.balls, ballR: R })
      : [];
    shoot();
  }

  // ── Main loop (canvas drawing) ─────────────────────────────────────────────
  // NOTE: With react-native-skia, drawing happens in the Canvas component via
  // onDraw callback or imperative canvasRef. For simplicity this template uses
  // the imperative approach — replace with Skia declarative components as needed.
  // See: https://shopify.github.io/react-native-skia/

  function loop(ts) {
    const dt = G.lastTs ? Math.min((ts - G.lastTs) / 16, 3) : 1;
    G.lastTs = ts;
    updateBullet(dt);
    updateBalls(dt);
    updateParticles(dt);
    // Trigger re-render for canvas (use forceUpdate or state tick)
    G.animFrame = requestAnimationFrame(loop);
  }

  function updateBullet(dt) {
    const b = G.bullet;
    if (!b) return;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 18) b.trail.shift();
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x - 5 < 0)  { b.x = 5;     b.vx =  Math.abs(b.vx); b.bounced = true; }
    if (b.x + 5 > SW) { b.x = SW - 5; b.vx = -Math.abs(b.vx); b.bounced = true; }
    if (b.y < SAFE_TOP) { G.bullet = null; G.shooting = false; return; }
    for (const ball of G.balls) {
      if (ball.popping || ball.falling) continue;
      const dx = b.x - ball.x, dy = b.y - ball.y;
      if (dx * dx + dy * dy < (R + 6) * (R + 6)) {
        onHit(ball); G.bullet = null; G.shooting = false; return;
      }
    }
    if (b.y > SH + 60) { G.bullet = null; G.shooting = false; }
  }

  function updateBalls(dt) {
    for (let i = G.balls.length - 1; i >= 0; i--) {
      const b = G.balls[i];
      if (b.opacity < 1) b.opacity = Math.min(1, b.opacity + .08 * dt);
      if (b.falling) { b.vy += .5 * dt; b.y += b.vy * dt; if (b.y > SH + R * 2) { G.balls.splice(i, 1); } }
      if (b.popping) { b.popT += .1 * dt; b.opacity = Math.max(0, 1 - b.popT * 2.4); if (b.opacity <= 0) G.balls.splice(i, 1); }
    }
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .2 * dt; p.life -= p.decay * dt;
      if (p.life <= 0) G.particles.splice(i, 1);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!fontsLoaded) return <View style={s.root} />;

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {/* GAME CANVAS — replace this View with actual Skia Canvas in production */}
      <View
        style={s.canvas}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={evt => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          if (phase !== 'playing' || G.falling) return;
          let a = Math.atan2(y - CANNON_Y, x - CANNON_X);
          a = Math.max(-Math.PI + .06, Math.min(-.06, a));
          G.cannonAngle = a;
          G.ghostPts = G.ghostOn
            ? traceAimLine({ startX: CANNON_X, startY: CANNON_Y, angle: a, screenW: SW, balls: G.balls, ballR: R })
            : [];
        }}
      />

      {/* HUD */}
      {phase === 'playing' && (
        <View style={s.hud} pointerEvents="none">
          <View>
            <Text style={s.scoreText}>⭐ {score}</Text>
            <Text style={s.roundText}>TUR {round}</Text>
          </View>
          <Text style={[s.timerText, timer <= 10 && s.timerUrgent]}>{timer}</Text>
        </View>
      )}

      {/* Word slots */}
      {phase === 'playing' && (
        <View style={s.slots} pointerEvents="none">
          {wordProgress.map((ch, i) => (
            <View key={i} style={[s.slot, ch && s.slotFilled]}>
              <Text style={[s.slotText, ch && s.slotTextFilled]}>{ch || ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Buttons */}
      {phase === 'playing' && (
        <View style={s.panel}>
          <TouchableOpacity
            style={[s.btn, s.btnGhost, !ghostOn && s.btnGhostOff]}
            onPress={toggleGhost}
          >
            <Text style={s.btnText}>👁 {ghostOn ? 'Nişan: Açık' : 'Nişan: Kapalı (+20%)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnHint, hintLeft === 0 && s.btnDisabled]}
            onPress={useHint}
            disabled={hintLeft === 0}
          >
            <Text style={s.btnText}>💡 İpucu ({hintLeft})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Motivation */}
      {motivation && (
        <View style={s.motivWrap} pointerEvents="none">
          <Text style={[s.motivText, { color: motivation.color }]}>{motivation.text}</Text>
        </View>
      )}

      {/* Start */}
      {phase === 'start' && (
        <View style={s.overlay}>
          <Text style={s.overlayTitle}>🎈 Harf Balonu</Text>
          <Text style={s.overlayDesc}>
            {'Hedef kelimeyi patlayarak bul.\n'}
            {'👁 Nişan kapalı → '}
            <Text style={{ color: '#ffe44d' }}>+%20 puan</Text>
            {'\nDuvardan sektirir → Bonus!\n'}
            {'💡 İpucu → harf patlar, -5 sn\nHer 5 turda kelime uzar.'}
          </Text>
          <TouchableOpacity style={s.overlayBtn} onPress={startGame}>
            <Text style={s.overlayBtnText}>OYNA!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* End */}
      {phase === 'end' && (
        <View style={s.overlay}>
          <Text style={s.overlayTitle}>{endMsg.split('\n')[0]}</Text>
          <Text style={s.overlayDesc}>{endMsg.split('\n')[1]}</Text>
          <TouchableOpacity style={s.overlayBtn} onPress={startGame}>
            <Text style={s.overlayBtnText}>TEKRAR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#060d1a' },
  canvas:  { position: 'absolute', inset: 0 },
  hud:     { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 30,
             left: 0, right: 0, flexDirection: 'row',
             justifyContent: 'space-between', paddingHorizontal: 18 },
  scoreText: { fontFamily: 'Rubik_900Black', fontSize: 20, color: '#ffe44d' },
  roundText: { fontFamily: 'Rubik_700Bold',  fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  timerText: { fontFamily: 'Rubik_900Black', fontSize: 32, color: '#fff' },
  timerUrgent: { color: '#ff4444' },

  slots: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 76,
           left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  slot: { width: 30, height: 34, borderRadius: 5, borderBottomWidth: 2.5,
          borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)',
          alignItems: 'center', justifyContent: 'center' },
  slotFilled: { borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.2)' },
  slotText: { fontFamily: 'Rubik_900Black', fontSize: 16, color: '#fff' },
  slotTextFilled: { color: '#2ecc71' },

  panel: { position: 'absolute', bottom: 0, left: 0, right: 0,
           backgroundColor: 'rgba(0,0,0,0.9)', paddingBottom: Platform.OS === 'ios' ? 34 : 14,
           paddingTop: 10, paddingHorizontal: 14, flexDirection: 'row', gap: 8, justifyContent: 'center' },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnGhost:    { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostOff: { backgroundColor: '#d63031' },
  btnHint:     { background: 'linear-gradient(135deg,#6c5ce7,#a29bfe)', backgroundColor: '#6c5ce7' },
  btnDisabled: { opacity: .35 },
  btnText: { fontFamily: 'Rubik_700Bold', fontSize: 13, color: '#fff' },

  motivWrap: { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  motivText: { fontFamily: 'Rubik_900Black', fontSize: 44, textShadowColor: 'rgba(0,0,0,0.4)',
               textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },

  overlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
             backgroundColor: 'rgba(4,10,22,0.95)', padding: 30 },
  overlayTitle: { fontFamily: 'Rubik_900Black', fontSize: 42, color: '#ffe44d', marginBottom: 16,
                  textAlign: 'center', textShadowColor: '#ffa500',
                  textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 20 },
  overlayDesc:  { fontFamily: 'Rubik_700Bold', fontSize: 15, color: '#b0ccee',
                  textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  overlayBtn:   { backgroundColor: '#ffe44d', paddingHorizontal: 48, paddingVertical: 16,
                  borderRadius: 50, shadowColor: '#ffa500', shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 20, shadowOpacity: .6 },
  overlayBtnText: { fontFamily: 'Rubik_900Black', fontSize: 22, color: '#111', letterSpacing: 2 },
});
