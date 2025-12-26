import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, FileText } from "lucide-react";

interface OpenSourceLicensesScreenProps {
    onBack: () => void;
}

export function OpenSourceLicensesScreen({
    onBack,
}: OpenSourceLicensesScreenProps) {
    return (
        <div className="w-full h-full bg-background text-foreground overflow-y-auto scrollbar-hide">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h1 className="font-medium">오픈소스 라이선스</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 space-y-6 pb-20">
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>안내</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed">
                        <p>
                            비유노트 앱은 다음 오픈소스 소프트웨어를 사용하고 있으며,
                            각 프로젝트의 라이선스를 준수합니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            아래 내용은 이해를 돕기 위한 요약입니다. 실제 법적 효력은 각
                            프로젝트의 원문 라이선스가 가집니다.
                        </p>
                    </CardContent>
                </Card>
                {/* shadcn/ui */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>1. shadcn/ui (MIT License)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            UI 컴포넌트 일부는 shadcn/ui 프로젝트에서 가져온 코드 기반으로
                            구현되었습니다.
                        </p>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            <li>개인·상업적 용도로 자유롭게 사용 가능</li>
                            <li>코드를 수정·배포 가능</li>
                            <li>배포 시 원 저작권 표시와 라이선스 전문을 포함해야 함</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                            자세한 내용은 shadcn/ui GitHub 저장소의 LICENSE 파일을 참고해 주세요.
                        </p>
                    </CardContent>
                </Card>

                {/* Lucide / lucide-react */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>2. Lucide Icons / lucide-react (ISC &amp; MIT)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            앱에서 사용하는 아이콘 중 상당수는 Lucide 아이콘 라이브러리를
                            사용합니다.
                        </p>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            <li>ISC 라이선스 및 Feather 기반 부분의 MIT 라이선스</li>
                            <li>개인·상업적 사용, 수정, 배포 허용</li>
                            <li>배포 시 저작권 및 라이선스 고지를 포함해야 함</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                            자세한 내용은 lucide.dev 및 관련 GitHub 저장소의 LICENSE를 참고해 주세요.
                        </p>
                    </CardContent>
                </Card>

                {/* 기타 오픈소스 라이브러리 */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>3. 기타 오픈소스 라이브러리</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <div>
                            <p className="font-semibold text-foreground mb-1">
                                핵심 프레임워크 / 도구
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>React, React DOM (MIT)</li>
                                <li>Vite (MIT)</li>
                                <li>Capacitor / @capacitor/* (MIT)</li>
                                <li>Firebase JavaScript SDK / Firebase Admin SDK (Apache-2.0)</li>
                                <li>Genkit / Google GenAI SDK (Apache-2.0)</li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-semibold text-foreground mb-1">
                                UI · 컴포넌트 · 레이아웃
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>
                                    Radix UI Primitives
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        (@radix-ui/react-accordion 등, MIT)
                                    </span>
                                </li>
                                <li>Vaul – 드로어 컴포넌트 (MIT)</li>
                                <li>Embla Carousel React – 캐러셀 컴포넌트 (MIT)</li>
                                <li>React Day Picker – 날짜 선택기 (MIT)</li>
                                <li>React Resizable Panels – 패널 레이아웃 (MIT)</li>
                                <li>cmdk – 커맨드 팔레트 컴포넌트 (MIT)</li>
                                <li>input-otp – OTP 입력 컴포넌트 (MIT)</li>
                                <li>Lucide React – 아이콘 컴포넌트 (ISC &amp; MIT)</li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-semibold text-foreground mb-1">
                                폼 · 유틸리티 · 스타일
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>React Hook Form – 폼 상태/검증 (MIT)</li>
                                <li>
                                    Class Variance Authority (CVA)
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        (Apache-2.0)
                                    </span>
                                </li>
                                <li>clsx – className 유틸리티 (MIT)</li>
                                <li>tailwind-merge – Tailwind 클래스 머지 (MIT)</li>
                                <li>date-fns – 날짜 유틸리티 (MIT)</li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-semibold text-foreground mb-1">
                                애니메이션 · 차트 · 토스트 · 기타
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Motion – 애니메이션 라이브러리 (MIT)</li>
                                <li>Recharts – 차트/그래프 컴포넌트 (MIT)</li>
                                <li>Sonner – 토스트/알림 컴포넌트 (MIT)</li>
                                <li>React Icons – 아이콘 모음 (MIT)</li>
                            </ul>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            위에 적힌 라이브러리는 대표적인 예시이며, 실제로는 더 많은
                            오픈소스 패키지가 사용됩니다. 각 패키지의 LICENSE 파일은
                            소스 코드와 빌드 결과물에 함께 포함되어 있습니다.
                        </p>
                    </CardContent>
                </Card>

                {/* 아바타 · 외부 API */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>4. 아바타 · 외부 API</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            기본 프로필 아바타 이미지는 DiceBear Avatars 서비스에서 제공하는 API를
                            통해 생성됩니다.
                        </p>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            <li>개인·상업적 사용 가능 (MIT 유사 라이선스)</li>
                            <li>아바타 이미지를 그대로 재판매하거나, 동일한 아바타 생성 서비스를 복제하는 행위는 금지</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                            자세한 내용은 DiceBear 웹사이트(dicebear.com)의 라이선스 및 이용 약관을 참고해 주세요.
                        </p>
                    </CardContent>
                </Card>

                {/* 참고 안내 */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>5. 기타 안내</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            이 화면에 적힌 내용은 이해를 돕기 위한 요약이며,
                            실제 법적 효력은 각 오픈소스 라이브러리의 LICENSE 전문에
                            따릅니다.
                        </p>
                        <p>
                            빌드 설정에서 오픈소스 라이선스 파일(예:{" "}
                            <code className="text-xs">third-party-licenses.txt</code>
                            )을 생성하도록 설정한 경우, 해당 파일에 각 패키지의
                            저작권 정보와 라이선스 전문이 자동으로 포함되며
                            앱과 함께 배포됩니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            상용 서비스 출시 전에 실제 사용 중인 라이브러리와 버전,
                            라이선스 파일이 잘 포함되어 있는지 한 번 더 점검해 주세요.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
