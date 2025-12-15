import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, FileText } from "lucide-react";

interface TermsOfServiceScreenProps {
  onBack: () => void;
}

export function TermsOfServiceScreen({ onBack }: TermsOfServiceScreenProps) {
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
              <h1 className="font-medium">이용약관</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-20">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>제1조 (목적)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              이 약관은 비유노트(이하 "회사")가 제공하는 비유노트 서비스(이하 "서비스")의
              이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항,
              기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제2조 (정의)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <div className="pl-4 space-y-2">
              <p>
                1. "서비스"란 구현되는 단말기(PC, 휴대형단말기 등의 각종 유무선 장치를 포함)와
                상관없이 "이용자"가 이용할 수 있는 비유노트 관련 제반 서비스를 의미합니다.
              </p>
              <p>
                2. "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
              </p>
              <p>
                3. "회원"이란 회사와 서비스 이용계약을 체결하고 회원 아이디(ID)를 부여받은 자를 말합니다.
              </p>
              <p>
                4. "게시물"이란 "회원"이 "서비스"를 이용함에 있어 "서비스"에 게시한 글, 사진, 동영상 및
                각종 파일과 링크 등을 의미합니다.
              </p>
              <p>
                5. "등불"이란 회원이 다른 회원의 게시물이나 댓글에 공감을 표시하는 기능을 말합니다.
              </p>
              <p>
                6. "루멘"이란 답글 등불 10개당 1개씩 지급되는 가상 화폐로, 칭호 구매에 사용됩니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제3조 (약관의 게시와 개정)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에
              게시합니다.
            </p>
            <p>
              2. 회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」
              등 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </p>
            <p>
              3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여
              현행약관과 함께 제1항의 방식에 따라 그 개정약관의 적용일자
              7일 전부터 적용일자 전일까지 공지합니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제4조 (서비스의 제공 및 변경)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>회사는 다음과 같은 업무를 수행합니다:</p>
            <div className="pl-4 space-y-2">
              <p>1. 학습 관련 커뮤니티 서비스 제공</p>
              <p>2. 게시판 서비스 제공</p>
              <p>3. 검색 서비스 제공</p>
              <p>4. 등불 및 루멘 시스템 운영</p>
              <p>5. 칭호 시스템 운영</p>
              <p>6. 기타 회사가 정하는 업무</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제5조 (서비스 이용)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 서비스는 회사의 업무상 또는 기술상 특별한 지장이 없는 한
              연중무휴, 1일 24시간 운영을 원칙으로 합니다.
            </p>
            <p>
              2. 회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장,
              통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을
              일시적으로 중단할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제6조 (회원가입)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후
              이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
            </p>
            <p>
              2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중
              다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
            </p>
            <div className="pl-4 space-y-2">
              <p>• 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</p>
              <p>• 등록 내용에 허위, 기재누락, 오기가 있는 경우</p>
              <p>• 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</p>
              <p>• 만 14세 미만의 아동인 경우 (회사는 만 14세 미만의 회원가입을 제한합니다)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제7조 (회원 탈퇴 및 자격 상실 등)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.
            </p>
            <p>
              2. 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다:
            </p>
            <div className="pl-4 space-y-2">
              <p>• 가입 신청 시에 허위 내용을 등록한 경우</p>
              <p>• 다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</p>
              <p>• 서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제8조 (회원에 대한 통지)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회사가 회원에 대한 통지를 하는 경우, 회원이 회사와 미리 약정하여
              지정한 전자우편 주소로 할 수 있습니다.
            </p>
            <p>
              2. 회사는 불특정다수 회원에 대한 통지의 경우 7일 이상 서비스 화면에
              게시함으로써 개별 통지에 갈음할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제9조 (게시물의 저작권 및 관리)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.
            </p>
            <p>
              2. 회원이 서비스 내에 게시하는 게시물은 검색결과 내지 서비스 및 관련 프로모션 등에
              노출될 수 있으며, 해당 노출을 위해 필요한 범위 내에서는 일부 수정, 복제, 편집되어
              게시될 수 있습니다.
            </p>
            <p>
              3. 회사는 제2항 이외의 방법으로 회원의 게시물을 이용하고자 하는 경우에는
              전화, 팩스, 전자우편 등을 통해 사전에 회원의 동의를 얻어야 합니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제10조 (게시물의 삭제 정책) ⚠️</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p className="font-medium text-primary">
              비유노트는 신중한 커뮤니케이션을 장려하기 위해 다음과 같은 삭제 정책을 운영합니다:
            </p>
            <div className="pl-4 space-y-2 mt-3">
              <p>
                1. <strong>게시글 삭제 제한:</strong> 게시글 작성 후 30분이 경과한 경우,
                해당 게시글은 삭제할 수 없습니다.
              </p>
              <p>
                2. <strong>답글 삭제 불가:</strong> 답글은 작성 시점과 무관하게
                삭제할 수 없습니다.
              </p>
              <p>
                3. <strong>예외 사항:</strong> 다음의 경우 회사가 직접 게시물을 삭제할 수 있습니다:
              </p>
              <p>
                4. 제1항 및 제2항에도 불구하고, 게시물에 개인정보가 노출되었거나 저작권 침해 등 권리 침해 사실이 소명되는 경우, 회원은 고객센터를 통해 삭제를 요청할 수 있으며 회사는 이에 응해야 합니다.
              </p>
              <div className="pl-4 space-y-1">
                <p>• 법령을 위반하는 내용</p>
                <p>• 타인의 권리를 침해하는 내용</p>
                <p>• 공서양속에 반하는 내용</p>
                <p>• 회사가 정한 커뮤니티 가이드라인을 위반하는 내용</p>
              </div>
            </div>
            <p className="mt-4 text-muted-foreground text-xs">
              이 정책은 사용자가 작성하는 내용에 대해 충분히 고민하고,
              책임감 있게 커뮤니케이션하도록 유도하기 위함입니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제11조 (등불 및 루멘 시스템)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. <strong>등불 시스템:</strong> 회원은 다른 회원의 게시물이나 답글에 등불을 켤 수 있습니다.
            </p>
            <div className="pl-4 space-y-2">
              <p>• 게시글 등불: 표시 용도로만 사용됩니다.</p>
              <p>• 답글 등불: 루멘 적립에 사용됩니다 (10개당 루멘 1개).</p>
            </div>
            <p className="mt-3">
              2. <strong>루멘:</strong> 답글에서 받은 등불을 통해 획득한 가상 화폐로,
              칭호 구매에만 사용할 수 있습니다.
            </p>
            <p className="mt-3">
              3. <strong>길잡이 채택:</strong> 게시글 작성자는 자신의 게시글에 달린 답글 중
              하나를 길잡이로 채택할 수 있으며, 채택된 답글 작성자는 루멘 5개를 받습니다.
            </p>
            <p className="mt-3 text-muted-foreground text-xs">
              4. <strong>환불 및 양도 불가:</strong> 서비스 내에서 획득한 등불 및 루멘은
              현금으로 환불되거나 타인에게 양도할 수 없으며, 재산적 가치가 없습니다.
              회원 탈퇴 시 보유한 루멘은 즉시 소멸되며 복구되지 않습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제12조 (칭호 시스템)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회원은 루멘을 사용하여 칭호를 구매할 수 있습니다.
            </p>
            <p>
              2. 칭호는 길잡이 채택 횟수에 따라 8단계로 나뉘며, 각 단계별로
              구매 조건이 다릅니다.
            </p>
            <p>
              3. 구매한 칭호는 회원 프로필에 표시되며, 언제든지 변경할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제13조 (금지행위)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>회원은 다음 행위를 하여서는 안 됩니다:</p>
            <div className="pl-4 space-y-2">
              <p>1. 신청 또는 변경 시 허위 내용의 등록</p>
              <p>2. 타인의 정보 도용</p>
              <p>3. 회사가 게시한 정보의 변경</p>
              <p>4. 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</p>
              <p>5. 회사 기타 제3자의 저작권 등 지적재산권에 대한 침해</p>
              <p>6. 회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</p>
              <p>7. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</p>
              <p>8. 욕설, 비방, 혐오 발언 등 타인에게 불쾌감을 주는 행위</p>
              <p>9. 스팸, 광고성 게시물 작성</p>
              <p>10. 개인정보 유출 또는 타인의 개인정보 무단 수집</p>
              <p className="mt-3 text-red-500 font-medium">
                ※ 회사는 위 금지행위를 위반하거나 불쾌한 콘텐츠(Objectionable Content)를 게시한 회원에 대해,
                사전 통보 없이 게시물 삭제 및 서비스 이용 제한(영구 정지) 조치를 취할 수 있습니다.
                회사는 불량 이용자에 대해 "무관용 원칙(Zero Tolerance Policy)"을 적용합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제14조 (면책조항)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를
              제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
            </p>
            <p>
              2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여
              책임을 지지 않습니다.
            </p>
            <p>
              3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나
              상실한 것에 대하여 책임을 지지 않습니다.
            </p>
            <p>
              4. 회사는 회원이 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의
              내용에 관하여는 책임을 지지 않습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제15조 (분쟁해결)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고
              그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.
            </p>
            <p>
              2. 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여
              이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는
              시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>제16조 (재판권 및 준거법)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              1. 회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은
              제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는
              거소를 관할하는 지방법원의 전속관할로 합니다.
            </p>
            <p>
              2. 회사와 이용자 간에 제기된 전자상거래 소송에는 대한민국 법을 적용합니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">
              <strong>부칙</strong><br />
              <span className="text-muted-foreground">
                이 약관은 2025년 1월 1일부터 적용됩니다.
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

}
