function result = GraphSenseWebReference(xVal, yVal, titleText, unitText)
% Experimental MATLAB reference for the GraphSense web beta.
% This file is separate from the locked competition submission.
% The browser beta must match its value-to-frequency mapping: 220 to 880 Hz.

if nargin < 3, titleText = ''; end
if nargin < 4, unitText = ''; end
if numel(xVal) ~= numel(yVal) || numel(yVal) < 2
    error('xVal and yVal must contain the same number of at least two values.');
end

[maxY, maxIndex] = max(yVal);
[minY, minIndex] = min(yVal);
yRange = max(yVal) - min(yVal);
if abs(yVal(end) - yVal(1)) < max(yRange * 0.07, eps
    trend = 'a broadly steady pattern';
elseif yVal(end) > yVal(1)
    trend = 'an overall rising pattern';
else
    trend = 'an overall falling pattern';
end

unitSuffix = '';
if ~isempty(unitText), unitSuffix = [' ' unitText]; end
titlePrefix = '';
if ~isempty(titleText), titlePrefix = [titleText '. ']; end

result.description = sprintf(['%sThis supported line graph shows %s. It starts near %.2f%s at x = %.2f and ends near %.2f%s at x = %.2f. ' ...
    'The highest detected value is %.2f%s near x = %.2f. The lowest detected value is %.2f%s near x = %.2f.'], ...
    titlePrefix, trend, yVal(1), unitSuffix, xVal(1), yVal(end), unitSuffix, xVal(end), maxY, unitSuffix, xVal(maxIndex), minY, unitSuffix, xVal(minIndex));

result.frequencies = 220 + ((yVal - minY) ./ max(yRange, eps)) * 660;
result.start = [xVal(1), yVal(1)];
result.finish = [xVal(end), yVal(end)];
result.maximum = [xVal(maxIndex), maxY];
result.minimum = [xVal(minIndex), minY];
end
