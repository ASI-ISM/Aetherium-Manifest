{{/* Expand chart name with optional override. */}}
{{- define "aetherium-manifest.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Compose a collision-safe fullname: <release>-<env>-<name>. */}}
{{- define "aetherium-manifest.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := include "aetherium-manifest.name" . -}}
{{- $env := default "dev" .Values.global.environment -}}
{{- printf "%s-%s-%s" .Release.Name $env $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/* Chart label helper. */}}
{{- define "aetherium-manifest.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Common labels for all manifest-owned resources. */}}
{{- define "aetherium-manifest.labels" -}}
helm.sh/chart: {{ include "aetherium-manifest.chart" . }}
app.kubernetes.io/name: {{ include "aetherium-manifest.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: aetherium-manifest
aetherium.io/environment: {{ default "dev" .Values.global.environment | quote }}
{{- end -}}
