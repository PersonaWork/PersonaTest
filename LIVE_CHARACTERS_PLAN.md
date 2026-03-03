# 🎭 Live Character Animations & Interactions Plan

## 🎯 **Current State**
- ✅ LiveCam component exists (`src/components/character/LiveCam.tsx`)
- ✅ Characters have `idleClipUrl` in environment
- ✅ Character detail pages show live video

## 🎬 **Animation System Architecture**

### **1. Live Video Streams**
```
Character Live Stream Pipeline:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Character │ →  │   LiveCam    │ →  │   User View │
│   AI Brain  │    │   Component  │    │   Browser   │
└─────────────┘    └──────────────┘    └─────────────┘
```

### **2. Character Actions & Animations**
Each character has predefined actions in their `actions` array:
```typescript
actions: [
  {
    id: "wave",
    name: "Wave Hello", 
    clipUrl: "wave.mp4",
    audioUrl: "wave.mp3",
    rarity: "common",
    weight: 30
  },
  {
    id: "dance",
    name: "Dance Move",
    clipUrl: "dance.mp4", 
    audioUrl: "dance.mp3",
    rarity: "rare",
    weight: 5
  }
]
```

### **3. Real-time Animation Triggers**

#### **A. Event-Based Triggers**
- **Chat Messages**: Character responds with specific animation
- **Share Purchases**: Celebration animation
- **Milestone Hits**: Special rare animations
- **Time-based**: Random idle animations

#### **B. AI-Driven Animations**
```typescript
// AI decides which animation to show based on context
const selectAnimation = (message: string, personality: traits) => {
  if (message.includes("hello")) return animations.wave;
  if (message.includes("dance")) return animations.dance;
  return animations.idle;
};
```

## 🎨 **Animation Production Pipeline**

### **Phase 1: Core Animations (Week 1-2)**
1. **Idle Animations** (5 per character)
   - Breathing, looking around, subtle movements
   - 10-15 second loops
   - File: `luna_idle_1.mp4`

2. **Reaction Animations** (10 per character)
   - Happy, sad, excited, thinking
   - 3-5 seconds each
   - File: `rex_happy.mp4`

3. **Greeting Animations** (3 per character)
   - Wave, bow, special hello
   - File: `nova_wave.mp4`

### **Phase 2: Interactive Animations (Week 3-4)**
1. **Chat Responses** (20 per character)
   - Nodding, shaking head, pointing
   - Context-aware responses
   - File: `dot_agree.mp4`

2. **Trading Animations** (5 per character)
   - Celebration for purchases
   - Thank you gestures
   - File: `luna_celebrate.mp4`

### **Phase 3: Rare Animations (Week 5-6)**
1. **Special Moves** (2-3 per character)
   - Dance routines, special poses
   - Triggered by rare events
   - File: `rex_special_dance.mp4`

## 🎬 **Animation Production Tools**

### **Video Generation Options:**
1. **Replicate AI** - Already integrated
   - Use `minimax/video-01` for custom animations
   - Generate character-specific movements

2. **Custom 3D Animation** (Recommended)
   - Blender + ReadyPlayerMe avatars
   - Export as MP4 with transparent background
   - Upload to CDN

3. **Live Motion Capture** (Advanced)
   - Use motion capture suits
   - Real-time character streaming
   - Higher engagement but expensive

## 🎵 **Audio & Voice Integration**

### **Voice Generation Pipeline:**
```
Text → ElevenLabs API → Character Voice → Audio File → Sync with Video
```

### **Audio Production:**
1. **Voice Lines** (50 per character)
   - Pre-recorded common phrases
   - AI-generated for unique responses
   - File: `luna_hello.mp3`

2. **Background Music** (3 per character)
   - Ambient audio matching personality
   - File: `rex_ambient.mp3`

3. **Sound Effects** (20 per character)
   - Notification sounds, transitions
   - File: `notification.mp3`

## 🔄 **Real-time Animation System**

### **Animation State Machine:**
```typescript
class CharacterAnimation {
  currentState: 'idle' | 'greeting' | 'chatting' | 'celebrating';
  currentAnimation: Animation;
  
  playAnimation(animationId: string) {
    // Switch video source
    // Play synchronized audio
    // Update character state
  }
  
  onMessage(message: string) {
    const response = ai.generateResponse(message);
    const animation = selectAnimation(response);
    this.playAnimation(animation.id);
  }
}
```

### **WebSocket Integration:**
```typescript
// Real-time animation updates
ws.on('character_action', (data) => {
  if (data.characterId === currentCharacter) {
    playAnimation(data.animationId);
  }
});
```

## 📱 **User Experience Flow**

### **Character Page Interaction:**
1. **Load Character** → Play idle animation
2. **User Sends Message** → AI processes → Trigger response animation
3. **User Buys Shares** → Play celebration animation
4. **Random Events** → Play rare animations

### **Animation Controls:**
- **Play/Pause** - User control
- **Volume** - Audio settings
- **Quality** - Low/medium/high video quality
- **Fullscreen** - Immersive character view

## 🎯 **Implementation Priority**

### **Week 1: MVP Animations**
- [ ] 1 idle animation per character
- [ ] 1 greeting animation per character  
- [ ] Basic chat response animations
- [ ] Audio integration with ElevenLabs

### **Week 2: Enhanced Interactions**
- [ ] 5 reaction animations per character
- [ ] Trading celebration animations
- [ ] Improved AI animation selection
- [ ] Background music integration

### **Week 3: Advanced Features**
- [ ] Rare animations system
- [ ] Real-time animation triggers
- [ ] Custom animation upload tools
- [ ] Animation marketplace

## 🛠️ **Technical Implementation**

### **File Structure:**
```
/assets/characters/
  /luna/
    /animations/
      idle_1.mp4
      wave.mp4
      dance.mp4
    /audio/
      voice_hello.mp3
      ambient.mp3
  /rex/
    /animations/
    /audio/
```

### **CDN Integration:**
- Upload all animations to CDN
- Use `NEXT_PUBLIC_CDN_BASE_URL`
- Optimize for streaming
- Support multiple quality levels

### **Performance Optimization:**
- Lazy load animations
- Preload critical animations
- Use video streaming formats (HLS)
- Implement caching strategies

## 🎬 **Next Steps**

1. **Set Up Animation Studio** - Blender + character models
2. **Create Core Animations** - Start with idle and greeting
3. **Integrate with AI** - Connect animation selection to chat
4. **Test Real-time Performance** - WebSocket + video streaming
5. **Launch with MVP** - Basic animations + voice
6. **Expand Library** - Add more animations over time

## 💰 **Budget Estimates**

### **Option 1: AI-Generated (Low Cost)**
- Replicate video generation: $200/month
- ElevenLabs voice: $50/month  
- Total: ~$250/month

### **Option 2: Custom 3D (Medium Cost)**
- 3D artist: $2,000 (one-time)
- Animation software: $500 (one-time)
- Voice actor: $1,000 (one-time)
- Total: ~$3,500 (one-time)

### **Option 3: Professional Studio (High Cost)**
- Motion capture: $10,000 (one-time)
- Professional animators: $5,000/month
- Studio time: $2,000/month
- Total: ~$17,000/month

## 🎯 **Success Metrics**

- **User Engagement**: Time spent on character pages
- **Animation Usage**: Which animations are most popular
- **Chat Interaction**: Messages per session
- **Share Trading**: Purchases after animations
- **Retention**: Daily active users

---

**🚀 Ready to start building the future of interactive AI characters!**
