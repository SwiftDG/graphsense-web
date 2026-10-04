# GraphSense web beta

An accessible, client-side prototype for interpreting supported single-series line graph images through text and sonification.

## Scope

- One clear, high-contrast line graph with visible axes
- User-confirmed x- and y-axis ranges
- Browser-local image processing: no image uploads or accounts
- Text overview plus downloadable WAV sonification

This beta does not support multiple series, bar charts, scatter plots, handwritten graphs, or full OCR.

## MATLAB provenance

`matlab-reference/` contains new experimental MATLAB functions for Hough-based axis detection, trend description, and the 220–880 Hz sonification mapping. They do not alter `GraphSense.m` or `GraphSense_v2.m`, the locked competition submissions.

## Run locally

Open `index.html` in a browser, or use VS Code Live Server. No package install is required.
