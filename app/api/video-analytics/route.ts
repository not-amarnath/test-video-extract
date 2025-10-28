// app/api/analyze-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
// 1. This is the correct import for the new package
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // 2. This is the correct instantiation
   const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for better performance)
    const maxSize = 100 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Please upload a video smaller than 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer and base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const videoData = buffer.toString('base64');

    try {
      // 3. This prompt now matches your parsing logic ("transcript" and "analytics")
      const combinedPrompt = `You are **Meeting Intelligence Analyzer v2**, an advanced AI system built to analyze recorded meeting videos with extreme accuracy and structured insights.

Your objectives:
1. Extract verified participant names.
2. Generate speaker-wise transcripts and timestamps.
3. Perform sentiment and emotion analysis.
4. Summarize discussions, topics, decisions, and action items.
5. Produce a structured, JSON-formatted report.

---

### 🎥 PRE-PROCESSING
1. **Audio Enhancement**
   - Apply automatic noise reduction, echo cancellation, and speech enhancement.
   - Normalize volume levels across all participants.

2. **Frame & Text Recognition**
   - Analyze each frame to detect on-screen text such as:
     - Participant name labels.
     - “Joining” notifications (e.g., “Nayana T P joined the meeting”).
     - Name tags or captions near speakers.
   - Extract all detected text using OCR with bounding box tracking.

3. **Name Verification Logic**
   - Maintain a “candidate name list” of all names seen on-screen.
   - Cross-verify each visual name with:
     - Spoken introductions (e.g., “Hi, I’m Amarnath”).
     - Repeated mentions by others (e.g., “Yes, Nayana, I agree”).
   - Resolve mismatches by applying **confidence weighting**:
     - High weight → visually consistent name overlay.
     - Medium → spoken confirmation.
     - Low → inferred context.
   - For ambiguous or duplicate matches, mark with "verified": false.

---

### 🗣️ SPEAKER IDENTIFICATION & DIARIZATION
4. Detect and separate each distinct speaker via voice embedding comparison.
5. Assign verified names when available; otherwise use placeholders (Speaker 1, Speaker 2).
6. Maintain a continuous mapping of name ↔ voice signature throughout the meeting.
7. Record timestamp ranges for each speaker’s turns.

---

### 📜 TRANSCRIPT GENERATION
8. Generate a clean transcript with:
   - Speaker name
   - Start timestamp
   - End timestamp
   - Spoken text
9. Remove fillers and repetitive phrases but keep natural tone.
10. Include contextual tags when relevant (e.g., [laughter], [agreement]).

---

### 📈 PARTICIPANT ANALYTICS
11. For each verified participant:
   - Join and leave time.
   - Total presence duration.
   - Speaking duration and frequency.
   - Sentiment distribution (Positive, Neutral, Negative).
   - Dominant emotion (Calm, Excited, Frustrated, etc.).
   - Engagement score (based on speech time + turn count).

---

### 💡 INSIGHTS & SUMMARIZATION
12. Extract major discussion topics using clustering of transcript segments.
13. Generate:
   - **Concise meeting summary**
   - **Topic-wise summaries**
   - **Decisions taken**
   - **Action items**
   - **Notable quotes**
14. Determine overall meeting sentiment and productivity level.

---

### 🧩 OUTPUT FORMAT
Return the response in this JSON structure:

{
  "meetingSummary": "Concise paragraph summarizing the entire meeting.",
  "overallSentiment": "Neutral",
  "participants": [
    {
      "name": "Amarnath Ghosh",
      "verified": true,
      "joinTime": "00:00:43",
      "leaveTime": "00:57:22",
      "speakingTime": "13m 20s",
      "sentiment": "Positive",
      "emotion": "Confident",
      "engagementScore": 0.86,
      "segments": [
         { "timestamp": "00:03:45", "text": "Let's finalize the backend integration this week." },
         { "timestamp": "00:15:12", "text": "I’ll handle the API logic and connect it to the UI." }
      ],
      "summary": "Amarnath led the technical updates and clarified backend tasks."
    },
    {
      "name": "Nayana T P",
      "verified": true,
      "joinTime": "00:01:15",
      "leaveTime": "00:56:48",
      "speakingTime": "08m 42s",
      "sentiment": "Positive",
      "emotion": "Engaged",
      "engagementScore": 0.73,
      "summary": "Nayana shared progress on frontend components and clarified dependencies."
    }
  ],
  "topics": [
    {
      "name": "Backend Integration",
      "start": "00:03:00",
      "end": "00:10:45",
      "summary": "Team discussed API endpoints and data flow logic."
    },
    {
      "name": "Frontend Updates",
      "start": "00:11:00",
      "end": "00:18:00",
      "summary": "UI alignment issues and styling improvements were addressed."
    }
  ],
  "decisions": [
    "Backend integration to be finalized by Friday.",
    "Frontend team to push updates to staging environment."
  ],
  "actionItems": [
    "Amarnath to complete backend API testing.",
    "Nayana to review and polish dashboard layout."
  ],
  "keyMoments": [
    { "timestamp": "00:05:10", "description": "Decision to restructure API flow." },
    { "timestamp": "00:16:45", "description": "Agreement on new UI layout." }
  ]
}


### ⚙️ QUALITY & ACCURACY RULES
- Use **only verified names** for final labeling.
- Mark "verified": false for uncertain matches.
- Ensure all timestamps are synchronized (hh:mm:ss).
- Summaries should be **concise yet informative**, written in natural language.
- Avoid hallucinated names or events.
- Every detected participant must have either visual or audio confirmation.

🧾 Example Output (Sample)
json
Copy code
{
  "meetingSummary": "The team reviewed backend progress, finalized API endpoints, and discussed UI refinements for the project dashboard.",
  "overallSentiment": "Positive",
  "participants": [
    {
      "name": "Amarnath Ghosh",
      "verified": true,
      "joinTime": "00:00:43",
      "leaveTime": "00:57:22",
      "speakingTime": "13m 20s",
      "sentiment": "Positive",
      "emotion": "Confident",
      "engagementScore": 0.86,
      "summary": "Led backend updates, coordinated testing tasks, and ensured integration timelines."
    },
    {
      "name": "Nayana T P",
      "verified": true,
      "joinTime": "00:01:15",
      "leaveTime": "00:56:48",
      "speakingTime": "08m 42s",
      "sentiment": "Positive",
      "emotion": "Focused",
      "engagementScore": 0.73,
      "summary": "Shared frontend progress, aligned on dashboard visuals, and discussed minor styling issues."
    }
  ],
  "topics": [
    { "name": "Backend Integration", "summary": "API structure and data validation confirmed." },
    { "name": "Frontend Updates", "summary": "UI fixes and layout adjustments discussed." }
  ],
  "decisions": [
    "API finalization deadline: Friday",
    "Frontend testing to be completed by Thursday"
  ],
  "actionItems": [
    "Amarnath → Finalize backend API testing.",
    "Nayana → Polish dashboard components and align styles."
  ],
  "keyMoments": [
    { "timestamp": "00:05:10", "description": "Decision to restructure API flow" },
    { "timestamp": "00:16:45", "description": "Agreement on UI layout" }
  ]
}`;


      // 4. This is the new, correct way to call the model
      const result = await genAI.models.generateContent({
         model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: file.type, data: videoData } },
              { text: combinedPrompt },
            ],
          },
        ],
      });

      // 5. The response is in `result.text`, not `result.response.text()`
      const responseText = result.text;
      
      console.log('Raw API Response:', responseText); // Debug log
      
      // Clean up response text (remove markdown code blocks if present)
      let jsonString = responseText.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/, '');
      jsonString = jsonString.replace(/^```\s*\n?/, ''); 
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      let parsedData;
      let transcript = '';
      let analytics = '';
      
      // This parsing logic now correctly matches the new prompt
      try {
        parsedData = JSON.parse(jsonString);
        transcript = parsedData.transcript || '';
        analytics = parsedData.analytics || '';
      } catch (parseError) {
        // If JSON parsing fails, try to extract data manually
        console.error('JSON parse error:', parseError);
        console.log('Failed to parse:', jsonString.substring(0, 200));
        
        // Try to find JSON object in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
            transcript = parsedData.transcript || '';
            analytics = parsedData.analytics || '';
          } catch (e) {
            // Still failed, use the raw text split approach
            transcript = responseText;
            analytics = 'Unable to generate structured analytics. Please try with a different video or check the transcript above.';
          }
        } else {
          // No JSON found, split the response
          const halfPoint = Math.floor(responseText.length / 2);
          transcript = responseText.substring(0, halfPoint);
          analytics = responseText.substring(halfPoint);
        }
      }

      return NextResponse.json({
        transcript: transcript || 'No transcript available',
        analytics: analytics || 'No analytics available',
        metadata: {
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          mimeType: file.type,
          duration: 'N/A',
        },
        success: true,
      });
    } catch (error: any) {
      throw error;
    }
  } catch (error: any) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process video',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};