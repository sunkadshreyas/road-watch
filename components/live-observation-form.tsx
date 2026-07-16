'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Crosshair, MapPin, RotateCcw, Trophy } from "lucide-react";

import {
  createObservationAction,
} from "@/app/actions";
import { idleActionState } from "@/lib/action-state";
import { issueTypeMeta, issueTypeOptions } from "@/lib/constants";
import { getRoadProximityStatus, type ProximityStatus } from "@/lib/geo";
import { replaceMediaStream, stopMediaStream } from "@/lib/media-stream";
import { cn } from "@/lib/utils";

import { SubmitButton } from "@/components/submit-button";

type Detector = {
  detect: (input: HTMLCanvasElement) => Promise<Array<{ class: string; score: number }>>;
};

type LiveObservationFormProps = {
  roadId: string;
  roadName: string;
  roadCenterLat: number;
  roadCenterLng: number;
};

const severityOptions = [
  {
    value: 35,
    label: "Low",
    description: "Visible, but movement is still mostly possible.",
  },
  {
    value: 65,
    label: "Medium",
    description: "People must slow down or step around it.",
  },
  {
    value: 90,
    label: "High",
    description: "Unsafe or strongly blocking movement.",
  },
] as const;

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
}

export function LiveObservationForm({
  roadId,
  roadName,
  roadCenterLat,
  roadCenterLng,
}: LiveObservationFormProps) {
  const [state, action] = useActionState(createObservationAction, idleActionState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);

  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "ready" | "blocked"
  >("idle");
  const [cameraNote, setCameraNote] = useState(
    "Start the hunt to capture a road-only violation with GPS metadata.",
  );
  const [imageData, setImageData] = useState("");
  const [peopleDetected, setPeopleDetected] = useState(false);
  const [capturedAt, setCapturedAt] = useState("");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus | null>(null);
  const [confirmedDistantRoad, setConfirmedDistantRoad] = useState(false);
  const [severityScore, setSeverityScore] = useState(65);
  const [description, setDescription] = useState("");
  const isCameraReady = cameraStatus === "ready";
  const hasValidDescription = description.trim().length > 0;
  const needsDistanceConfirmation =
    Boolean(proximityStatus) && proximityStatus?.isNearby === false;
  const canSubmit = Boolean(
    imageData &&
      hasValidDescription &&
      !peopleDetected &&
      (!needsDistanceConfirmation || confirmedDistantRoad),
  );
  const selectedSeverity =
    severityOptions.find((option) => option.value === severityScore) ?? severityOptions[1];
  const captureButtonLabel =
    cameraStatus === "ready"
      ? "Capture live frame"
      : cameraStatus === "requesting"
        ? "Waiting for camera..."
        : cameraStatus === "blocked"
          ? "Camera blocked"
          : "Enable camera first";
  const cameraStatusLabel =
    cameraStatus === "ready"
      ? "Ready"
      : cameraStatus === "requesting"
        ? "Requesting access"
        : cameraStatus === "blocked"
          ? "Blocked"
          : "Not started";

  const stopStream = useCallback(() => {
    streamRef.current = replaceMediaStream(streamRef.current, null);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cameraRequestRef.current += 1;
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    formRef.current?.reset();
    const frame = requestAnimationFrame(() => {
      setImageData("");
      setPeopleDetected(false);
      setCapturedAt("");
      setGpsLat("");
      setGpsLng("");
      setProximityStatus(null);
      setConfirmedDistantRoad(false);
      setSeverityScore(65);
      setDescription("");
      setCameraNote("Violation collected. Capture another frame if you see another issue.");
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [state.status]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("blocked");
      setCameraNote("This browser does not support live camera capture.");
      return;
    }

    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    stopStream();
    let acquiredStream: MediaStream | null = null;

    try {
      setCameraStatus("requesting");
      setCameraNote("Requesting camera access and loading the person-detection model.");

      const [tfModule, cocoSsdModule] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/coco-ssd"),
      ]);

      await tfModule.ready();
      detectorRef.current ??= await cocoSsdModule.load();

      if (requestId !== cameraRequestRef.current) {
        return;
      }

      acquiredStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stopMediaStream(acquiredStream);
        return;
      }

      streamRef.current = replaceMediaStream(streamRef.current, acquiredStream);

      if (videoRef.current) {
        videoRef.current.srcObject = acquiredStream;
        await videoRef.current.play();
      }

      setCameraStatus("ready");
      setCameraNote("Live camera ready. Keep people out of frame and capture the issue directly.");
    } catch {
      stopMediaStream(acquiredStream);

      if (streamRef.current === acquiredStream) {
        streamRef.current = null;
      }

      if (requestId === cameraRequestRef.current) {
        setCameraStatus("blocked");
        setCameraNote("Camera access was blocked or unavailable. The live capture step cannot proceed.");
      }
    }
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
      setCameraNote("Start the live camera before capturing.");
      return;
    }

    try {
      const position = await getCurrentPosition();
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context unavailable.");
      }

      const scale = Math.min(
        1,
        1280 / video.videoWidth,
        720 / video.videoHeight,
      );
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const predictions = await detectorRef.current.detect(canvas);
      const hasVisiblePerson = predictions.some(
        (prediction) => prediction.class === "person" && prediction.score > 0.4,
      );

      if (hasVisiblePerson) {
        setPeopleDetected(true);
        setImageData("");
        setCapturedAt("");
        setGpsLat("");
        setGpsLng("");
        setProximityStatus(null);
        setConfirmedDistantRoad(false);
        setCameraNote("Frame rejected because a person was detected. Reframe and capture again.");
        return;
      }

      const proximity = getRoadProximityStatus(
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        {
          slug: roadId,
          name: roadName,
          centerLat: roadCenterLat,
          centerLng: roadCenterLng,
        },
      );

      setPeopleDetected(false);
      setImageData(canvas.toDataURL("image/jpeg", 0.82));
      setCapturedAt(new Date().toISOString());
      setGpsLat(String(position.coords.latitude));
      setGpsLng(String(position.coords.longitude));
      setProximityStatus(proximity);
      setConfirmedDistantRoad(false);
      setCameraNote(
        proximity.isNearby
          ? "Frame locked with GPS metadata. You can now add it to your collection."
          : "Frame locked, but the GPS point is not close to the selected road.",
      );
    } catch {
      setCameraNote("GPS permission is required. RoadWatch only accepts live frames with location attached.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_18px_48px_-28px_rgba(15,23,42,0.6)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              Capture encounter
            </p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-2xl font-semibold">
              {roadName}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Start camera, allow location, then snap the violation when the frame is clear.
            </p>
          </div>
          <button
            type="button"
            onClick={startCamera}
            disabled={cameraStatus === "requesting"}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {cameraStatus === "ready" ? "Restart camera" : "Start hunt"}
          </button>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900">
          {imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageData}
              alt="Live capture preview"
              className="h-[280px] w-full object-cover sm:h-[340px]"
            />
          ) : (
            <video
              ref={videoRef}
              className="h-[280px] w-full object-cover sm:h-[340px]"
              playsInline
              muted
            />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <span className="text-slate-300">Camera status</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              cameraStatus === "ready"
                ? "bg-emerald-400/15 text-emerald-300"
                : cameraStatus === "blocked"
                  ? "bg-rose-400/15 text-rose-300"
                  : "bg-slate-300/10 text-slate-200"
            }`}
          >
            {cameraStatusLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={captureFrame}
            disabled={!isCameraReady}
            className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            <Camera className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {captureButtonLabel}
          </button>
          {imageData ? (
            <button
              type="button"
              onClick={() => {
                setImageData("");
                setPeopleDetected(false);
                setCapturedAt("");
                setGpsLat("");
                setGpsLng("");
                setProximityStatus(null);
                setConfirmedDistantRoad(false);
                setCameraNote("Retake the frame if the issue is not clear enough.");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retake
            </button>
          ) : null}
        </div>

        {proximityStatus ? (
          <div
            className={cn(
              "rounded-[1.15rem] border px-4 py-3 text-sm",
              proximityStatus.isNearby
                ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                : "border-amber-300 bg-amber-400/10 text-amber-100",
            )}
          >
            {proximityStatus.label}
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
            <span>{cameraNote}</span>
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            Gallery uploads are not available in this MVP.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            If camera access does not start, open the app on <span className="font-semibold text-slate-200">http://localhost:3000</span>, not <span className="font-semibold text-slate-200">0.0.0.0</span> or an unsecured LAN address.
          </p>
        </div>
      </div>

      <form ref={formRef} action={action} className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.4)]">
        <input type="hidden" name="roadId" value={roadId} />
        <input type="hidden" name="captureMode" value="live-camera" />
        <input type="hidden" name="imageData" value={imageData} />
        <input type="hidden" name="peopleDetected" value={peopleDetected ? "true" : "false"} />
        <input type="hidden" name="capturedAt" value={capturedAt} />
        <input type="hidden" name="gpsLat" value={gpsLat} />
        <input type="hidden" name="gpsLng" value={gpsLng} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Encounter details
          </p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-2xl font-semibold text-slate-950">
            Log the violation
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Keep the note short: what it is and where it sits.
          </p>
        </div>

        {state.status !== "idle" ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              state.status === "success"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
          >
            {state.message}
            {state.status === "success" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/collection"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  My collection
                </Link>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  View leaderboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCameraNote("Ready for another nearby violation. Capture a fresh frame.");
                  }}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Collect another
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Issue type</span>
          <select
            name="issueType"
            defaultValue="POTHOLE"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
          >
            {issueTypeOptions.map((issueType) => (
              <option key={issueType} value={issueType}>
                {issueTypeMeta[issueType].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="flex items-center justify-between text-sm font-semibold text-slate-700">
            Severity
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {selectedSeverity.label}
            </span>
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {severityOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-[112px] cursor-pointer flex-col justify-between overflow-hidden rounded-[1.35rem] border px-4 py-3 transition",
                  severityScore === option.value
                    ? "border-teal-500 bg-teal-50 text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                )}
              >
                <input
                  type="radio"
                  name="severityScore"
                  value={option.value}
                  checked={severityScore === option.value}
                  onChange={() => setSeverityScore(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </label>

        <label className="block space-y-2">
          <span className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>Quick note</span>
            <span className="text-xs uppercase tracking-[0.16em] text-rose-600">
              Required
            </span>
          </span>
          <span className="text-xs text-slate-500">
            Example: Deep pothole near bus stop.
          </span>
          <textarea
            name="description"
            rows={4}
            placeholder="Describe the violation in one short note."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
          />
        </label>

        {!canSubmit ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {!imageData
              ? "Capture a live frame first."
              : needsDistanceConfirmation && !confirmedDistantRoad
                ? "Confirm that this capture belongs to the selected road before submitting."
                : "Add a short description before submitting."}
          </div>
        ) : null}

        {needsDistanceConfirmation ? (
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <input
              type="checkbox"
              name="confirmedDistantRoad"
              value="true"
              checked={confirmedDistantRoad}
              onChange={(event) => setConfirmedDistantRoad(event.target.checked)}
              className="mt-1 h-4 w-4 accent-amber-700"
            />
            <span>
              I confirm this violation belongs to {roadName}, even though the GPS point is not close to the selected road.
            </span>
          </label>
        ) : null}

        <SubmitButton
          label="Collect violation"
          pendingLabel="Collecting violation..."
          className="w-full"
          disabled={!canSubmit}
        />
      </form>
    </div>
  );
}
