"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { Service } from "@/app/models/service"
import { User } from "@/app/models/user"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AtSign, ArrowLeft, Check, Lock, Mail, Tv, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import ProfilePictureSection from "./ProfilePictureSection"

export type ProfileFormValues = {
    username: string
    name: string
    bio: string
    isPrivate: boolean
    serviceIds: number[]
}

type ProfileFormProps = {
    userData: User
    email: string | undefined
    presignedImageUrl: string | null
    services: Service[]
    userServiceIds: number[]
    saveFunction: (data: ProfileFormValues) => Promise<boolean>
}

export function EditProfileForm({ userData, email, presignedImageUrl, services, userServiceIds, saveFunction }: ProfileFormProps) {
    const router = useRouter()

    const form = useForm<ProfileFormValues>({
        defaultValues: {
            username: userData.username || "",
            name: userData.name || "",
            bio: userData.bio || "",
            isPrivate: userData.private || false,
            serviceIds: userServiceIds,
        },
    })

    async function onSubmit(data: ProfileFormValues) {
        const success = await saveFunction(data);
        if (success) {
            toast.success("Profile updated", {
                description: "Your profile has been successfully updated.",
                action: {
                    label: "Go to Profile",
                    onClick: () => router.push(`/profile/${data.username}`)
                }
            })
        } else {
            toast.error("Error", {
                description: "There was an error updating your profile. Please try again.",
            })
        }
    }

    return (
        <div className="p-6 md:p-8">
            {/* Profile Picture Section */}
            <div className="mb-8 pb-8 border-b border-white/10">
                <ProfilePictureSection userData={userData} presignedImageUrl={presignedImageUrl} />
            </div>

            {/* Email Display */}
            <div className="mb-8 pb-8 border-b border-white/10">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-white/80 mb-1 block">Email</label>
                        <p className="text-white font-medium">{email}</p>
                        <p className="text-white/50 text-sm mt-1">
                            This is your login email. It cannot be changed.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Username Field */}
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white/80">Username</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                                        <Input
                                            className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary/20"
                                            placeholder="yourusername"
                                            required
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-white/50">
                                    This is your unique identifier. It will appear in your profile URL.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Name Field */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white/80">Display Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                                        <Input 
                                            className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary/20" 
                                            placeholder="John Doe" 
                                            {...field} 
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-white/50">
                                    This is your public display name. It can be your real name or a pseudonym.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Bio Field */}
                    <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white/80">Bio</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Tell us a little bit about yourself and what shows you love..."
                                        className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary/20 resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription className="text-white/50">
                                    Write a short bio to introduce yourself to other users.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Private Account Toggle */}
                    <FormField
                        control={form.control}
                        name="isPrivate"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start justify-between rounded-xl bg-white/5 border border-white/10 p-5 gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Lock className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <FormLabel className="text-base text-white">Private Account</FormLabel>
                                        <FormDescription className="text-white/50">
                                            When enabled, only people you approve can see your profile and activity.
                                        </FormDescription>
                                    </div>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        aria-label="Private account"
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {/* My Services */}
                    <FormField
                        control={form.control}
                        name="serviceIds"
                        render={({ field }) => (
                            <FormItem className="rounded-xl bg-white/5 border border-white/10 p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Tv className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <FormLabel className="text-base text-white">My Services</FormLabel>
                                        <FormDescription className="text-white/50">
                                            Pick the services you have access to, then filter show searches to just those. Only you can see this.
                                        </FormDescription>
                                    </div>
                                </div>
                                <FormControl>
                                    <div className="flex flex-wrap gap-2 pt-3">
                                        {services.map((service) => {
                                            const selected = field.value.includes(service.id)
                                            return (
                                                <Button
                                                    key={service.id}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    aria-pressed={selected}
                                                    className={`${selected ? 'bg-white text-black hover:bg-white/80 hover:text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                                    onClick={() => field.onChange(
                                                        selected
                                                            ? field.value.filter((id) => id !== service.id)
                                                            : [...field.value, service.id]
                                                    )}
                                                >
                                                    {service.name}
                                                    {selected && <Check className="ml-1 h-3 w-3" />}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-white/10">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto border-white/20 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}