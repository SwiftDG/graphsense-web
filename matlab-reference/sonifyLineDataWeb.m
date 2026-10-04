function sonifyLineDataWeb(yVal, outputFile)
% MATLAB reference implementation for the beta's 220-880 Hz audio mapping.
fs = 44100;
duration = 0.15;
minFreq = 220;
maxFreq = 880;

yNorm = (yVal - min(yVal)) / (max(yVal) - min(yVal) + eps);
freqs = minFreq + yNorm * (maxFreq - minFreq);
audioOut = [];
t = 0:1/fs:duration;
for i = 1:length(freqs)
    tone = sin(2*pi*freqs(i)*t);
    envelope = hann(length(tone))';
    audioOut = [audioOut, tone .* envelope]; %#ok<AGROW>
end
audiowrite(outputFile, audioOut, fs);
end
