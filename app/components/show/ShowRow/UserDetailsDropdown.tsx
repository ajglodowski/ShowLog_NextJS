import { UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { backdropBackground } from "@/app/utils/stylingConstants";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AvatarsBubbleRow } from "./AvatarsBubbleRow";
import { UserDetails } from "./UserDetails";

export const UserDetailsDropdown = ({ currentUserInfo, otherUsersInfo }: { currentUserInfo: UserShowDataWithUserInfo, otherUsersInfo: UserShowDataWithUserInfo[] }) => {
    // Filter out duplicate users from otherUsersInfo that match currentUserInfo
    const filteredOtherUsers = otherUsersInfo.filter(user => user.user.id !== currentUserInfo.user.id);
    
    return (
        <div className="w-auto flex justify-end">
            <div className="flex items-center">
                <DropdownMenu>
                    {/* The avatars are async server components, so they go in as plain children. Cloning them
                        through asChild/render made the server and client HTML disagree (hydration error). */}
                    <DropdownMenuTrigger render={<Button className={`${backdropBackground} py-6 -px-2 border`} />}>
                        <AvatarsBubbleRow currentUserInfo={currentUserInfo} otherUsersInfo={filteredOtherUsers}/>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={`${backdropBackground} text-white min-w-[300px]`}>
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <UserDetails userInfo={currentUserInfo} />
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        
                        {filteredOtherUsers.length > 0 && (
                            <DropdownMenuGroup>
                                {filteredOtherUsers.map((userInfo, index) => (
                                    <DropdownMenuItem key={`${userInfo.user.id}_${index}`}>
                                        <UserDetails userInfo={userInfo} />
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}