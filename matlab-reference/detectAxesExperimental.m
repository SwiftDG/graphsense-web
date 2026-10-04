function axes = detectAxesExperimental(imagePath)
% Experimental MATLAB reference for automatic axis detection.
% Adapted from the working test_hough.m sandbox. It does not modify the
% submitted GraphSense.m or GraphSense_v2.m files.

img = imread(imagePath);
if size(img, 3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end

edges = edge(gray, 'canny');
[H, theta, rho] = hough(edges);
peaks = houghpeaks(H, 20, 'Threshold', 0.3 * max(H(:)));
lines = houghlines(edges, theta, rho, peaks, 'FillGap', 20, 'MinLength', 50);

xAxisCandidate = [];
yAxisCandidate = [];
bottomMostY = 0;
leftMostX = inf;

for k = 1:length(lines)
    p1 = lines(k).point1;
    p2 = lines(k).point2;
    angle = abs(lines(k).theta);
    avgY = (p1(2) + p2(2)) / 2;
    avgX = (p1(1) + p2(1)) / 2;

    if abs(angle - 90) < 5 && avgY > bottomMostY
        bottomMostY = avgY;
        xAxisCandidate = lines(k);
    elseif (angle < 5 || angle > 175) && avgX < leftMostX
        leftMostX = avgX;
        yAxisCandidate = lines(k);
    end
end

if isempty(xAxisCandidate) || isempty(yAxisCandidate)
    error('GraphSense:AxesNotFound', 'Could not find both chart axes.');
end

axes.xAxis = xAxisCandidate;
axes.yAxis = yAxisCandidate;
axes.xAxisY = round(mean([xAxisCandidate.point1(2), xAxisCandidate.point2(2)]));
axes.yAxisX = round(mean([yAxisCandidate.point1(1), yAxisCandidate.point2(1)]));
axes.detectedLineCount = length(lines);
end
