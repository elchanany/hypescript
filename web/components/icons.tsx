"use client";

import { forwardRef } from "react";
import {
  ArrowBendUpLeftIcon,
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  ArrowsOutCardinalIcon,
  AtIcon,
  CalendarDotsIcon,
  CameraIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  ChartBarIcon,
  ChatCenteredTextIcon,
  ChatCircleDotsIcon,
  ChatCircleIcon,
  ChatsIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardTextIcon,
  ClockIcon,
  ClosedCaptioningIcon,
  CloudIcon,
  CoinsIcon,
  ColumnsPlusLeftIcon,
  CommandIcon,
  CopyIcon,
  CornersOutIcon,
  CreditCardIcon,
  CursorClickIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileArrowDownIcon,
  FileArrowUpIcon,
  FilmSlateIcon,
  FilmStripIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GaugeIcon,
  GearSixIcon,
  GridFourIcon,
  HardDriveIcon,
  ImageIcon as PhosphorImageIcon,
  InfoIcon,
  IntersectIcon,
  LightningIcon,
  LinkBreakIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  LockKeyIcon,
  LockOpenIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MagnetIcon,
  MapPinIcon,
  MicrophoneIcon,
  MoonIcon,
  MusicNoteIcon,
  PaletteIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
  PauseIcon,
  PencilSimpleIcon,
  PushPinIcon,
  PlayIcon,
  PlusIcon,
  BookmarkSimpleIcon,
  CursorIcon,
  FlagIcon,
  SplitHorizontalIcon,
  PulseIcon,
  QuestionIcon,
  QuotesIcon,
  RobotIcon,
  ScissorsIcon,
  SealCheckIcon,
  SelectionIcon,
  SelectionPlusIcon,
  ShieldCheckIcon,
  SidebarSimpleIcon,
  SignInIcon,
  SignOutIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SpeakerHighIcon,
  SpeakerXIcon,
  SpinnerGapIcon,
  SquareIcon,
  StackIcon,
  StopCircleIcon,
  SunIcon,
  TextTIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserCircleIcon,
  UsersIcon,
  VideoCameraIcon,
  WarningIcon,
  WaveformIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon,
  type Icon as PhosphorIcon,
  type IconProps,
  type IconWeight,
} from "@phosphor-icons/react";

export type AppIconProps = Omit<IconProps, "weight"> & {
  /** Compatibility while the product migrates from stroke-based icons. */
  strokeWidth?: number;
  weight?: IconWeight;
};

export type AppIcon = ReturnType<typeof defineIcon>;

function defineIcon(Source: PhosphorIcon, displayName: string) {
  const Icon = forwardRef<SVGSVGElement, AppIconProps>(function HypescriptIcon(
    { strokeWidth: _strokeWidth, weight = "regular", ...props },
    ref,
  ) {
    return <Source ref={ref} weight={weight} aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
  });
  Icon.displayName = displayName;
  return Icon;
}

// Canonical product icon surface. Components import from here so sizing,
// weight and accessibility stay consistent even when the source family evolves.
export const Activity = defineIcon(PulseIcon, "Activity");
export const AlertTriangle = defineIcon(WarningIcon, "AlertTriangle");
export const ArrowLeft = defineIcon(ArrowLeftIcon, "ArrowLeft");
export const ArrowRight = defineIcon(ArrowRightIcon, "ArrowRight");
export const ArrowLeftRight = defineIcon(ArrowsLeftRightIcon, "ArrowLeftRight");
export const AtSign = defineIcon(AtIcon, "AtSign");
export const AudioLines = defineIcon(WaveformIcon, "AudioLines");
export const AudioWaveform = defineIcon(WaveformIcon, "AudioWaveform");
export const BadgeCheck = defineIcon(SealCheckIcon, "BadgeCheck");
export const BarChart3 = defineIcon(ChartBarIcon, "BarChart3");
export const BetweenHorizontalStart = defineIcon(ColumnsPlusLeftIcon, "BetweenHorizontalStart");
export const Blend = defineIcon(IntersectIcon, "Blend");
export const Bot = defineIcon(RobotIcon, "Bot");
export const CalendarDays = defineIcon(CalendarDotsIcon, "CalendarDays");
export const Camera = defineIcon(CameraIcon, "Camera");
export const Captions = defineIcon(ClosedCaptioningIcon, "Captions");
export const Check = defineIcon(CheckIcon, "Check");
export const CheckCircle2 = defineIcon(CheckCircleIcon, "CheckCircle2");
export const ChevronDown = defineIcon(CaretDownIcon, "ChevronDown");
export const ChevronUp = defineIcon(CaretUpIcon, "ChevronUp");
export const ChevronsUpDown = defineIcon(CaretUpDownIcon, "ChevronsUpDown");
export const Clapperboard = defineIcon(FilmSlateIcon, "Clapperboard");
export const ClipboardList = defineIcon(ClipboardTextIcon, "ClipboardList");
export const Clock = defineIcon(ClockIcon, "Clock");
export const Clock3 = defineIcon(ClockIcon, "Clock3");
export const Cloud = defineIcon(CloudIcon, "Cloud");
export const Coins = defineIcon(CoinsIcon, "Coins");
export const Command = defineIcon(CommandIcon, "Command");
export const Copy = defineIcon(CopyIcon, "Copy");
export const CornerUpLeft = defineIcon(ArrowBendUpLeftIcon, "CornerUpLeft");
export const CreditCard = defineIcon(CreditCardIcon, "CreditCard");
export const Download = defineIcon(DownloadSimpleIcon, "Download");
export const ExternalLink = defineIcon(ArrowSquareOutIcon, "ExternalLink");
export const Eye = defineIcon(EyeIcon, "Eye");
export const FileDown = defineIcon(FileArrowDownIcon, "FileDown");
export const FileUp = defineIcon(FileArrowUpIcon, "FileUp");
export const Film = defineIcon(FilmStripIcon, "Film");
export const FolderOpen = defineIcon(FolderOpenIcon, "FolderOpen");
export const Gauge = defineIcon(GaugeIcon, "Gauge");
export const HardDrive = defineIcon(HardDriveIcon, "HardDrive");
export const HelpCircle = defineIcon(QuestionIcon, "HelpCircle");
export const Image = defineIcon(PhosphorImageIcon, "Image");
export const Info = defineIcon(InfoIcon, "Info");
export const Layers = defineIcon(StackIcon, "Layers");
export const Layers3 = defineIcon(StackIcon, "Layers3");
export const LayoutGrid = defineIcon(GridFourIcon, "LayoutGrid");
export const Bookmark = defineIcon(BookmarkSimpleIcon, "Bookmark");
export const Cursor = defineIcon(CursorIcon, "Cursor");
export const Flag = defineIcon(FlagIcon, "Flag");
export const Magnet = defineIcon(MagnetIcon, "Magnet");
export const Mic = defineIcon(MicrophoneIcon, "Mic");
export const Split = defineIcon(SplitHorizontalIcon, "Split");
export const Link2 = defineIcon(LinkIcon, "Link2");
export const List = defineIcon(ListIcon, "List");
export const Loader2 = defineIcon(SpinnerGapIcon, "Loader2");
export const Lock = defineIcon(LockIcon, "Lock");
export const LockKeyhole = defineIcon(LockKeyIcon, "LockKeyhole");
export const LogIn = defineIcon(SignInIcon, "LogIn");
export const LogOut = defineIcon(SignOutIcon, "LogOut");
export const MapPin = defineIcon(MapPinIcon, "MapPin");
export const Maximize = defineIcon(CornersOutIcon, "Maximize");
export const Maximize2 = defineIcon(CornersOutIcon, "Maximize2");
export const MessageCircle = defineIcon(ChatCircleIcon, "MessageCircle");
export const MessageSquarePlus = defineIcon(ChatCircleDotsIcon, "MessageSquarePlus");
export const MessageSquareText = defineIcon(ChatCenteredTextIcon, "MessageSquareText");
export const MessagesSquare = defineIcon(ChatsIcon, "MessagesSquare");
export const Moon = defineIcon(MoonIcon, "Moon");
export const MoreHorizontal = defineIcon(DotsThreeIcon, "MoreHorizontal");
export const MousePointer2 = defineIcon(CursorClickIcon, "MousePointer2");
export const Move = defineIcon(ArrowsOutCardinalIcon, "Move");
export const Music = defineIcon(MusicNoteIcon, "Music");
export const OctagonX = defineIcon(StopCircleIcon, "OctagonX");
export const Palette = defineIcon(PaletteIcon, "Palette");
export const PanelLeftClose = defineIcon(SidebarSimpleIcon, "PanelLeftClose");
export const PanelRightClose = defineIcon(SidebarSimpleIcon, "PanelRightClose");
export const Paperclip = defineIcon(PaperclipIcon, "Paperclip");
export const Pause = defineIcon(PauseIcon, "Pause");
export const Pencil = defineIcon(PencilSimpleIcon, "Pencil");
export const Play = defineIcon(PlayIcon, "Play");
export const Plus = defineIcon(PlusIcon, "Plus");
export const Pin = defineIcon(PushPinIcon, "Pin");
export const Quote = defineIcon(QuotesIcon, "Quote");
export const Redo2 = defineIcon(ArrowClockwiseIcon, "Redo2");
export const RefreshCw = defineIcon(ArrowClockwiseIcon, "RefreshCw");
export const Reply = defineIcon(ArrowBendUpLeftIcon, "Reply");
export const Robot = defineIcon(RobotIcon, "Robot");
export const RotateCcw = defineIcon(ArrowCounterClockwiseIcon, "RotateCcw");
export const RotateCw = defineIcon(ArrowClockwiseIcon, "RotateCw");
export const Save = defineIcon(FloppyDiskIcon, "Save");
export const ScanText = defineIcon(TextTIcon, "ScanText");
export const Scissors = defineIcon(ScissorsIcon, "Scissors");
export const Search = defineIcon(MagnifyingGlassIcon, "Search");
export const Send = defineIcon(PaperPlaneTiltIcon, "Send");
export const Settings = defineIcon(GearSixIcon, "Settings");
export const ShieldCheck = defineIcon(ShieldCheckIcon, "ShieldCheck");
export const SkipBack = defineIcon(SkipBackIcon, "SkipBack");
export const SkipForward = defineIcon(SkipForwardIcon, "SkipForward");
export const SlidersHorizontal = defineIcon(SlidersHorizontalIcon, "SlidersHorizontal");
export const Sparkles = defineIcon(SparkleIcon, "Sparkles");
export const Square = defineIcon(SquareIcon, "Square");
export const SquareDashed = defineIcon(SelectionIcon, "SquareDashed");
export const SquareDashedMousePointer = defineIcon(SelectionPlusIcon, "SquareDashedMousePointer");
export const StopCircle = defineIcon(StopCircleIcon, "StopCircle");
export const Sun = defineIcon(SunIcon, "Sun");
export const Trash2 = defineIcon(TrashIcon, "Trash2");
export const TriangleAlert = defineIcon(WarningIcon, "TriangleAlert");
export const Type = defineIcon(TextTIcon, "Type");
export const Undo2 = defineIcon(ArrowCounterClockwiseIcon, "Undo2");
export const Unlink2 = defineIcon(LinkBreakIcon, "Unlink2");
export const Unlock = defineIcon(LockOpenIcon, "Unlock");
export const Upload = defineIcon(UploadSimpleIcon, "Upload");
export const UserRound = defineIcon(UserCircleIcon, "UserRound");
export const Users = defineIcon(UsersIcon, "Users");
export const Video = defineIcon(VideoCameraIcon, "Video");
export const Volume2 = defineIcon(SpeakerHighIcon, "Volume2");
export const VolumeX = defineIcon(SpeakerXIcon, "VolumeX");
export const Wand2 = defineIcon(MagicWandIcon, "Wand2");
export const WandSparkles = defineIcon(MagicWandIcon, "WandSparkles");
export const Wrench = defineIcon(WrenchIcon, "Wrench");
export const X = defineIcon(XIcon, "X");
export const XCircle = defineIcon(XCircleIcon, "XCircle");
export const Zap = defineIcon(LightningIcon, "Zap");
export const ZoomIn = defineIcon(MagnifyingGlassPlusIcon, "ZoomIn");
export const ZoomOut = defineIcon(MagnifyingGlassMinusIcon, "ZoomOut");
