'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { Badge } from '@/subframe/components/Badge';
import { Table } from '@/subframe/components/Table';
import { RecordingSection } from '../components/RecordingSection';

export default function Home() {
  const [primaryEmotion, setPrimaryEmotion] = useState({ name: '-', score: 0 });
  const [emotions, setEmotions] = useState<Array<{ name: string; score: number }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLiveAnalysis, setIsLiveAnalysis] = useState(false);

  const handleEmotionsUpdate = (newEmotions: Array<{ name: string; score: number }>, isFinal: boolean) => {
    // Sort emotions by score in descending order
    const sortedEmotions = [...newEmotions].sort((a, b) => b.score - a.score);
    setEmotions(sortedEmotions);
    if (sortedEmotions.length > 0) {
      setPrimaryEmotion(sortedEmotions[0]);
    }
    setShowResults(true);
    setIsLiveAnalysis(!isFinal);
  };

  // Clear results when recording starts
  const handleRecordingStart = () => {
    setShowResults(false);
    setEmotions([]);
    setPrimaryEmotion({ name: '-', score: 0 });
    setIsLiveAnalysis(false);
  };

  const getEmotionStyle = (emotionName: string) => {
    const colors: { [key: string]: string } = {
      sadness: '#1B2A35',
      horror: '#2D004D',
      fear: '#4A003F',
      anxiety: '#5A3D72',
      distress: '#9D89A3',
      anger: '#D42A1C',
      'empathic-pain': '#E0744A',
      sympathy: '#FEC468',
      shame: '#5B1A5D',
      guilt: '#A28A33',
      doubt: '#8B93C0',
      embarrassment: '#FFA2AF',
      pain: '#7D2121',
      awkwardness: '#943356',
      disappointment: '#54717C',
      envy: '#A8C94E',
      disgust: '#527244',
      contempt: '#AA735A',
      confusion: '#E8C1D0',
      interest: '#FFD247',
      contemplation: '#CBD452',
      realization: '#FFF199',
      nostalgia: '#A7D2A5',
      awe: '#65FF71',
      entrancement: '#4EB8A2',
      satisfaction: '#4DB8B5',
      contentment: '#4F837A',
      craving: '#6F7B45',
      relief: '#78D6D2',
      calmness: '#B6D8EE',
      boredom: '#8A8A8A',
      tiredness: '#CBCACA',
      concentration: '#E7661F',
      admiration: '#FF72B8',
      pride: '#FFD146',
      joy: '#80E261',
      amusement: '#C5D644',
      excitement: '#B8FF29',
      triumph: '#D9E659',
      ecstasy: '#3EFF2E',
      'aesthetic-appreciation': '#723DA3',
      adoration: '#F9B9CF',
      love: '#F44B8E',
      romance: '#C11A4D',
      desire: '#EB6539',
      annoyance: '#E69F3C',
      disapproval: '#5D6E54',
      sarcasm: '#A6C747',
      enthusiasm: '#FF7F27',
      gratitude: '#D9A24E',
      'surprise-positive': '#82CFFD',
      'surprise-negative': '#4C3583'
    };

    const formattedName = emotionName.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace('positive', 'positive')
      .replace('negative', 'negative');
    
    console.log('Emotion:', emotionName, 'Formatted:', formattedName, 'Color:', colors[formattedName]);
    
    return {
      padding: '0.375rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: 'white',
      backgroundColor: colors[formattedName] || '#666666'
    };
  };

  return (
    <div className="min-h-screen bg-default-background">
      <div className="container max-w-none flex h-full w-full flex-col items-center gap-4 bg-default-background py-12">
        <div className="flex w-full max-w-[768px] flex-col items-center gap-6">
          <div className="flex w-full max-w-[576px] flex-col items-center justify-center gap-6 px-6 py-6">
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <span className="w-full text-heading-1 font-heading-1 text-default-font text-center">
                Fast Prosody
              </span>
              <span className="text-body font-body text-subtext-color text-center">
                3s chunks + weighted averaging + WebM header caching + selective chunk processing
              </span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <RecordingSection 
                onEmotionsUpdate={handleEmotionsUpdate}
                onRecordingStart={handleRecordingStart}
              />
            </div>
          </div>

          {showResults && emotions.length > 0 && (
            <div className="flex w-full flex-col items-start gap-12">
              <div className="flex w-full flex-col items-start gap-4">
                <div className="flex w-full flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-heading-2 font-heading-2 text-default-font">
                      Analysis Results
                    </span>
                    {isLiveAnalysis && (
                      <Badge variant="warning">Live Analysis</Badge>
                    )}
                  </div>
                </div>
                <div className="flex w-full items-start gap-4">
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-4 shadow-sm">
                    <div className="flex w-full items-center gap-4">
                      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Primary Emotion
                        </span>
                        <div style={getEmotionStyle(primaryEmotion.name)}>
                          {primaryEmotion.name}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-4 shadow-sm">
                    <div className="flex w-full items-center gap-4">
                      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Confidence Score
                        </span>
                        <Badge variant="warning">{(primaryEmotion.score * 100).toFixed(0)}%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col items-start gap-4">
                <div className="flex w-full flex-col items-start gap-1">
                  <span className="w-full text-heading-2 font-heading-2 text-default-font">
                    Emotion Breakdown
                  </span>
                </div>
                <Table
                  header={
                    <Table.HeaderRow>
                      <Table.HeaderCell>Emotion</Table.HeaderCell>
                      <Table.HeaderCell>Confidence</Table.HeaderCell>
                    </Table.HeaderRow>
                  }
                >
                  {emotions.slice(0, 5).map((emotion) => (
                    <Table.Row key={emotion.name}>
                      <Table.Cell>
                        <div style={getEmotionStyle(emotion.name)}>
                          {emotion.name}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="whitespace-nowrap text-body font-body text-default-font">
                          {(emotion.score * 100).toFixed(0)}%
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
